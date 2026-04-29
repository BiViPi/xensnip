use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, Emitter};
use xcap::Window;
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetClassNameW};
use windows::core::HSTRING;

pub fn capture_active_window(app: &AppHandle) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();

    let foreground_hwnd = unsafe { GetForegroundWindow() };
    let hwnd_isize = foreground_hwnd.0 as isize;
    
    if foreground_hwnd.0.is_null() {
        let err = CaptureError::WindowUnavailable();
        emit_failure(app, &err, &start_time);
        return Err(err);
    }

    // Get Title and ClassName directly from Windows API for debugging
    let mut title_buf = [0u16; 512];
    let title_len = unsafe { GetWindowTextW(foreground_hwnd, &mut title_buf) };
    let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);

    let mut class_buf = [0u16; 256];
    let class_len = unsafe { GetClassNameW(foreground_hwnd, &mut class_buf) };
    let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);

    log::info!(target: "capture", "Foreground Window: HWND={:?} (isize: {}), Class='{}', Title='{}'", foreground_hwnd, hwnd_isize, class_name, title);
    
    let windows = Window::all().map_err(|e| {
        let err = CaptureError::WgcFailure();
        log::warn!(target: "capture", "Window::all() failed: {:?}", e);
        emit_failure(app, &err, &start_time);
        err
    })?;

    // Try matching both full isize and truncated u32 (some libraries truncate HWNDs)
    let target_window = windows
        .into_iter()
        .find(|w| {
            let wid = w.id().unwrap_or(0) as isize;
            wid == hwnd_isize || (wid & 0xFFFFFFFF) == (hwnd_isize & 0xFFFFFFFF)
        });

    let target = match target_window {
        Some(w) => w,
        None => {
            log::warn!(target: "capture", "Could not find window with HWND {} in xcap window list. This happens if the window is a system menu, taskbar, or hidden/tool window.", hwnd_isize);
            let err = CaptureError::InvalidTarget();
            emit_failure(app, &err, &start_time);
            return Err(err);
        }
    };

    let process_name = target.app_name().ok().map(|s| s.to_string());
    let window_title = target.title().ok().map(|s| s.to_string());
    let win_x = target.x().unwrap_or(0);
    let win_y = target.y().unwrap_or(0);

    log::info!(target: "capture", "Capturing window: '{}' (process: {:?})", window_title.as_deref().unwrap_or("?"), process_name);

    let image = target.capture_image().map_err(|e| {
        let err = CaptureError::WgcFailure();
        log::warn!(
            target: "capture",
            "capture_image() failed for '{}': {:?}",
            window_title.as_deref().unwrap_or("?"),
            e
        );
        emit_failure(app, &err, &start_time);
        err
    })?;

    let width = image.width();
    let height = image.height();

    let raw = image.into_raw();
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    if let Some(img) = image::RgbaImage::from_raw(width, height, raw) {
        img.write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| {
                let err = CaptureError::WgcFailure();
                log::warn!(target: "capture", "PNG encode failed: {:?}", e);
                emit_failure(app, &err, &start_time);
                err
            })?;
    } else {
        let err = CaptureError::WgcFailure();
        emit_failure(app, &err, &start_time);
        return Err(err);
    }

    let id = format!("win_{}", chrono::Utc::now().timestamp_millis());
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset {
            id: id.clone(),
            data: bytes,
            width,
            height,
        });
    }

    app.emit("capture.result", serde_json::json!({ "asset_id": id }))
        .ok();

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Window,
        capture_method: crate::diagnostics::CaptureMethod::WgcWindow,
        output_size: crate::diagnostics::PhysicalSize { w_px: width, h_px: height },
        monitor_id: String::new(),
        dpi: 0,
        process_name,
        window_title,
        bounds_physical: crate::diagnostics::PhysicalBounds { x: win_x, y: win_y, w: width, h: height },
        asset_id: Some(id.clone()),
        error_class: None,
        error_code: None,
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);

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
        bounds_physical: crate::diagnostics::PhysicalBounds { x: 0, y: 0, w: 0, h: 0 },
        asset_id: None,
        error_class: Some(format!("{:?}", err.class)),
        error_code: Some(err.code.clone()),
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);
    app.emit("capture.failure", err).ok();
}
