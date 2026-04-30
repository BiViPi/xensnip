use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::HiDpi::GetDpiForWindow;
use windows::Win32::UI::WindowsAndMessaging::{GetClassNameW, GetForegroundWindow, GetWindowTextW};
use xcap::Window;

pub fn capture_active_window(app: &AppHandle) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();

    let foreground_hwnd = unsafe { GetForegroundWindow() };
    let hwnd_isize = foreground_hwnd.0 as isize;

    if foreground_hwnd.0.is_null() {
        let err = CaptureError::WindowUnavailable();
        emit_failure(app, &err, &start_time);
        return Err(err);
    }

    let mut title_buf = [0u16; 512];
    let title_len = unsafe { GetWindowTextW(foreground_hwnd, &mut title_buf) };
    let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);

    let mut class_buf = [0u16; 256];
    let class_len = unsafe { GetClassNameW(foreground_hwnd, &mut class_buf) };
    let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);

    log::info!(
        target: "capture",
        "Foreground Window: HWND={:?} (isize: {}), Class='{}', Title='{}'",
        foreground_hwnd,
        hwnd_isize,
        class_name,
        title
    );

    let windows = Window::all().map_err(|err| {
        let capture_err = CaptureError::WgcFailure();
        log::warn!(target: "capture", "Window::all() failed: {:?}", err);
        emit_failure(app, &capture_err, &start_time);
        capture_err
    })?;

    let target_window = windows.into_iter().find(|window| {
        let window_id = window.id().unwrap_or(0) as isize;
        window_id == hwnd_isize || (window_id & 0xFFFFFFFF) == (hwnd_isize & 0xFFFFFFFF)
    });

    let target = match target_window {
        Some(window) => window,
        None => {
            log::warn!(
                target: "capture",
                "Could not find window with HWND {} in xcap window list.",
                hwnd_isize
            );
            let err = CaptureError::InvalidTarget();
            emit_failure(app, &err, &start_time);
            return Err(err);
        }
    };

    let process_name = target.app_name().ok().map(|value| value.to_string());
    let window_title = target.title().ok().map(|value| value.to_string());
    let win_x = target.x().unwrap_or(0);
    let win_y = target.y().unwrap_or(0);

    let (actual_dpi, actual_monitor_id, monitor_work_area_logical) = unsafe {
        let dpi = GetDpiForWindow(foreground_hwnd);
        let dpi_pct = if dpi == 0 { 100 } else { dpi };

        let hmonitor = MonitorFromWindow(foreground_hwnd, MONITOR_DEFAULTTONEAREST);
        let mut monitor_info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        let monitor_name = if GetMonitorInfoW(hmonitor, &mut monitor_info).as_bool() {
            format!(
                "monitor_{}x{}",
                monitor_info.rcMonitor.left, monitor_info.rcMonitor.top
            )
        } else {
            String::new()
        };

        let work = monitor_info.rcWork;
        let work_area = crate::quick_access::MonitorWorkAreaLogical {
            x: logical_i32(work.left, dpi_pct),
            y: logical_i32(work.top, dpi_pct),
            w: logical_u32((work.right - work.left) as u32, dpi_pct),
            h: logical_u32((work.bottom - work.top) as u32, dpi_pct),
        };
        (dpi_pct, monitor_name, work_area)
    };

    log::info!(
        target: "capture",
        "Capturing window: '{}' (process: {:?})",
        window_title.as_deref().unwrap_or("?"),
        process_name
    );

    let image = target.capture_image().map_err(|err| {
        let capture_err = CaptureError::WgcFailure();
        log::warn!(
            target: "capture",
            "capture_image() failed for '{}': {:?}",
            window_title.as_deref().unwrap_or("?"),
            err
        );
        emit_failure(app, &capture_err, &start_time);
        capture_err
    })?;

    let width = image.width();
    let height = image.height();

    let raw = image.into_raw();
    let mut bytes = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    if let Some(rgba) = image::RgbaImage::from_raw(width, height, raw) {
        rgba.write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|err| {
                let capture_err = CaptureError::WgcFailure();
                log::warn!(target: "capture", "PNG encode failed: {:?}", err);
                emit_failure(app, &capture_err, &start_time);
                capture_err
            })?;
    } else {
        let err = CaptureError::WgcFailure();
        emit_failure(app, &err, &start_time);
        return Err(err);
    }

    let id = format!("win_{}", chrono::Utc::now().timestamp_millis());
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset::new(id.clone(), bytes, width, height));
    }

    app.emit("capture.result", serde_json::json!({ "asset_id": id }))
        .ok();

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Window,
        capture_method: crate::diagnostics::CaptureMethod::WgcWindow,
        output_size: crate::diagnostics::PhysicalSize {
            w_px: width,
            h_px: height,
        },
        monitor_id: actual_monitor_id.clone(),
        dpi: actual_dpi,
        process_name: process_name.clone(),
        window_title: window_title.clone(),
        bounds_physical: crate::diagnostics::PhysicalBounds {
            x: win_x,
            y: win_y,
            w: width,
            h: height,
        },
        asset_id: Some(id.clone()),
        error_class: None,
        error_code: None,
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);

    crate::quick_access::emit_show(
        app,
        &id,
        crate::quick_access::CapturePositionMeta {
            monitor_work_area_logical,
            monitor_dpi: actual_dpi,
            capture_kind: "window".to_string(),
            capture_rect_logical: Some(crate::quick_access::CaptureRectLogical {
                x: logical_i32(win_x, actual_dpi),
                y: logical_i32(win_y, actual_dpi),
                w: logical_u32(width, actual_dpi),
                h: logical_u32(height, actual_dpi),
            }),
        },
    );

    Ok(())
}

fn emit_failure(app: &AppHandle, err: &CaptureError, start_time: &std::time::Instant) {
    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Window,
        capture_method: crate::diagnostics::CaptureMethod::WgcWindow,
        output_size: crate::diagnostics::PhysicalSize { w_px: 0, h_px: 0 },
        monitor_id: String::new(),
        dpi: 0,
        process_name: None,
        window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds {
            x: 0,
            y: 0,
            w: 0,
            h: 0,
        },
        asset_id: None,
        error_class: Some(format!("{:?}", err.class)),
        error_code: Some(err.code.clone()),
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);
    app.emit("capture.failure", err).ok();
}

fn logical_i32(value: i32, dpi_pct: u32) -> i32 {
    if dpi_pct <= 100 {
        return value;
    }
    ((value as f64) / (dpi_pct as f64 / 100.0)).round() as i32
}

fn logical_u32(value: u32, dpi_pct: u32) -> u32 {
    if dpi_pct <= 100 {
        return value;
    }
    ((value as f64) / (dpi_pct as f64 / 100.0)).round() as u32
}
