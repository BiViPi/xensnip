use crate::capture::errors::CaptureError;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_EXTENDED_FRAME_BOUNDS};
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits,
    GetMonitorInfoW, GetWindowDC, MonitorFromWindow, ReleaseDC, SelectObject, BITMAPINFOHEADER,
    BI_RGB, CAPTUREBLT, DIB_RGB_COLORS, HDC, HGDIOBJ, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    SRCCOPY,
};
use windows::Win32::UI::HiDpi::GetDpiForWindow;
use windows::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetForegroundWindow, GetWindowRect, GetWindowTextW, IsIconic,
    PW_RENDERFULLCONTENT,
};
use xcap::Window;

unsafe extern "system" {
    fn PrintWindow(hwnd: HWND, hdcblt: HDC, nflags: u32) -> windows::core::BOOL;
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum BackendOverride {
    Auto,
    Gdi,
    Wgc,
}

fn preferred_failure_method(policy: &BackendOverride) -> crate::diagnostics::CaptureMethod {
    match policy {
        BackendOverride::Wgc => crate::diagnostics::CaptureMethod::WgcWindow,
        BackendOverride::Auto | BackendOverride::Gdi => {
            crate::diagnostics::CaptureMethod::GdiWindow
        }
    }
}

fn get_backend_override() -> BackendOverride {
    match std::env::var("XENSNIP_CAPTURE_BACKEND")
        .unwrap_or_default()
        .to_lowercase()
        .as_str()
    {
        "gdi" => BackendOverride::Gdi,
        "wgc" => BackendOverride::Wgc,
        _ => BackendOverride::Auto,
    }
}

pub fn capture_active_window(app: &AppHandle) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();
    let backend_policy = get_backend_override();
    let requested_method = preferred_failure_method(&backend_policy);

    let foreground_hwnd = unsafe { GetForegroundWindow() };
    if foreground_hwnd.0.is_null() {
        let err = CaptureError::WindowUnavailable();
        emit_failure(app, &err, &start_time, requested_method.clone());
        return Err(err);
    }

    let hwnd_isize = foreground_hwnd.0 as isize;

    // Resolve basic metadata via Win32 first
    let mut title_buf = [0u16; 512];
    let title_len = unsafe { GetWindowTextW(foreground_hwnd, &mut title_buf) };
    let window_title = Some(String::from_utf16_lossy(&title_buf[..title_len as usize]));

    let mut class_buf = [0u16; 256];
    let class_len = unsafe { GetClassNameW(foreground_hwnd, &mut class_buf) };
    let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);

    log::info!(
        target: "capture",
        "Active Window Capture: HWND={:?}, Class='{}', Title='{:?}', Policy={:?}",
        foreground_hwnd,
        class_name,
        window_title,
        backend_policy
    );

    let (win_x, win_y, win_w, win_h) =
        resolve_window_bounds_physical(foreground_hwnd).map_err(|err_msg| {
            log::error!(target: "capture", "Failed to resolve window bounds: {}", err_msg);
            let err = CaptureError::InvalidTarget();
            emit_failure(app, &err, &start_time, requested_method.clone());
            err
        })?;

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

    let mut final_image: Option<image::RgbaImage> = None;
    let mut final_method = requested_method;
    let mut process_name: Option<String> = None;

    // Try GDI path if policy allows
    if backend_policy == BackendOverride::Auto || backend_policy == BackendOverride::Gdi {
        log::info!(target: "capture", "Attempting GDI capture for HWND {:?}", foreground_hwnd);
        match capture_active_window_gdi(foreground_hwnd, (win_x, win_y, win_w, win_h)) {
            Ok(img) => {
                final_image = Some(img);
                final_method = crate::diagnostics::CaptureMethod::GdiWindow;
            }
            Err(e) => {
                log::warn!(target: "capture", "GDI capture failed: {}. Falling back if allowed.", e);
            }
        }
    }

    // Fallback to WGC if GDI failed or policy forces it
    if final_image.is_none()
        && (backend_policy == BackendOverride::Auto || backend_policy == BackendOverride::Wgc)
    {
        final_method = crate::diagnostics::CaptureMethod::WgcWindow;
        log::info!(target: "capture", "Attempting WGC capture fallback via xcap");
        let windows = Window::all().map_err(|err| {
            let capture_err = CaptureError::WgcFailure();
            log::warn!(target: "capture", "Window::all() failed: {:?}", err);
            emit_failure(
                app,
                &capture_err,
                &start_time,
                crate::diagnostics::CaptureMethod::WgcWindow,
            );
            capture_err
        })?;

        let target_window = windows.into_iter().find(|window| {
            let window_id = window.id().unwrap_or(0) as isize;
            window_id == hwnd_isize || (window_id & 0xFFFFFFFF) == (hwnd_isize & 0xFFFFFFFF)
        });

        if let Some(target) = target_window {
            process_name = target.app_name().ok().map(|value| value.to_string());
            match target.capture_image() {
                Ok(img) => {
                    let w: u32 = img.width();
                    let h: u32 = img.height();
                    let raw = img.into_raw();
                    final_image = image::RgbaImage::from_raw(w, h, raw);
                    final_method = crate::diagnostics::CaptureMethod::WgcWindow;
                }
                Err(e) => {
                    log::error!(target: "capture", "WGC capture failed: {:?}", e);
                }
            }
        } else {
            log::warn!(target: "capture", "Could not find window HWND {} in xcap list.", hwnd_isize);
        }
    }

    let image = match final_image {
        Some(img) => img,
        None => {
            let err = CaptureError::WgcFailure();
            emit_failure(app, &err, &start_time, final_method);
            return Err(err);
        }
    };

    let width = image.width();
    let height = image.height();

    let encode_start = std::time::Instant::now();
    let mut cursor = std::io::Cursor::new(Vec::new());
    let encoder = image::codecs::png::PngEncoder::new_with_quality(
        &mut cursor,
        image::codecs::png::CompressionType::Fast,
        image::codecs::png::FilterType::NoFilter,
    );
    image.write_with_encoder(encoder).map_err(|err| {
        let capture_err = CaptureError::WgcFailure();
        log::warn!(target: "capture", "PNG encode failed: {:?}", err);
        emit_failure(app, &capture_err, &start_time, final_method.clone());
        capture_err
    })?;
    let png_bytes = Arc::new(cursor.into_inner());
    log::info!(target: "perf", "Window PNG encoding (Fast) took {}ms", encode_start.elapsed().as_millis());

    let id = format!("win_{}", chrono::Utc::now().timestamp_millis());
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset::new(
            id.clone(),
            png_bytes,
            width,
            height,
        ));
    }

    app.emit("capture.result", serde_json::json!({ "asset_id": id }))
        .ok();

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Window,
        capture_method: final_method,
        output_size: crate::diagnostics::PhysicalSize {
            w_px: width,
            h_px: height,
        },
        monitor_id: actual_monitor_id.clone(),
        dpi: actual_dpi,
        process_name,
        window_title,
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

fn resolve_window_bounds_physical(hwnd: HWND) -> Result<(i32, i32, u32, u32), String> {
    unsafe {
        if IsIconic(hwnd).as_bool() {
            return Err("Window is minimized".into());
        }

        let mut rect = RECT::default();
        // Try DWM extended frame bounds first (actual visible window size)
        let hr = DwmGetWindowAttribute(
            hwnd,
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut rect as *mut _ as *mut _,
            std::mem::size_of::<RECT>() as u32,
        );

        if hr.is_err() || (rect.right - rect.left) <= 0 || (rect.bottom - rect.top) <= 0 {
            // Fallback to standard GetWindowRect
            if GetWindowRect(hwnd, &mut rect).is_err() {
                return Err("GetWindowRect failed".into());
            }
        }

        let w = (rect.right - rect.left) as u32;
        let h = (rect.bottom - rect.top) as u32;

        if w == 0 || h == 0 {
            return Err("Resolved window size is zero".into());
        }

        Ok((rect.left, rect.top, w, h))
    }
}

fn capture_active_window_gdi(
    hwnd: HWND,
    bounds: (i32, i32, u32, u32),
) -> Result<image::RgbaImage, String> {
    let (_, _, w, h) = bounds;

    unsafe {
        let hdc_window = GetWindowDC(Some(hwnd));
        if hdc_window.0.is_null() {
            return Err("GetWindowDC failed".into());
        }

        let hdc_mem = CreateCompatibleDC(Some(hdc_window));
        if hdc_mem.0.is_null() {
            let _ = ReleaseDC(Some(hwnd), hdc_window);
            return Err("CreateCompatibleDC failed".into());
        }

        let hbm = CreateCompatibleBitmap(hdc_window, w as i32, h as i32);
        if hbm.0.is_null() {
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(Some(hwnd), hdc_window);
            return Err("CreateCompatibleBitmap failed".into());
        }

        let hgdiobj = HGDIOBJ(hbm.0);
        let old_obj = SelectObject(hdc_mem, hgdiobj);

        let mut capture_result: Result<(), String> = Err("BitBlt failed".into());

        if BitBlt(
            hdc_mem,
            0,
            0,
            w as i32,
            h as i32,
            Some(hdc_window),
            0,
            0,
            SRCCOPY | CAPTUREBLT,
        )
        .is_ok()
        {
            capture_result = Ok(());
            log::info!(target: "capture", "GDI BitBlt successful");
        } else {
            log::warn!(target: "capture", "BitBlt failed; trying PrintWindow fallback");
            if PrintWindow(hwnd, hdc_mem, PW_RENDERFULLCONTENT).as_bool() {
                capture_result = Ok(());
                log::info!(target: "capture", "PrintWindow fallback successful");
            }
        }

        if let Err(err) = capture_result {
            let _ = SelectObject(hdc_mem, old_obj);
            let _ = DeleteObject(hgdiobj);
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(Some(hwnd), hdc_window);
            return Err(err);
        }

        let bmi = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: w as i32,
            biHeight: -(h as i32), // Top-down
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        };

        let mut buf = vec![0u8; (w * h * 4) as usize];
        let mut bmi_header = bmi;
        let copied = GetDIBits(
            hdc_mem,
            hbm,
            0,
            h,
            Some(buf.as_mut_ptr() as *mut _),
            (&mut bmi_header) as *mut _ as *mut _,
            DIB_RGB_COLORS,
        );

        let _ = SelectObject(hdc_mem, old_obj);
        let _ = DeleteObject(hgdiobj);
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(Some(hwnd), hdc_window);

        if copied == 0 {
            return Err("GetDIBits failed".into());
        }

        // Swap BGR to RGB
        for i in (0..buf.len()).step_by(4) {
            let b = buf[i];
            let r = buf[i + 2];
            buf[i] = r;
            buf[i + 2] = b;
        }

        image::RgbaImage::from_raw(w, h, buf)
            .ok_or_else(|| "Failed to create image from GDI buffer".into())
    }
}

fn emit_failure(
    app: &AppHandle,
    err: &CaptureError,
    start_time: &std::time::Instant,
    method: crate::diagnostics::CaptureMethod,
) {
    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Window,
        capture_method: method,
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
