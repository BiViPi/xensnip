use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, Emitter};
use xcap::Window;
use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

pub fn capture_active_window(app: &AppHandle) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();

    let foreground_hwnd = unsafe { GetForegroundWindow() };
    if foreground_hwnd.0.is_null() {
        let err = CaptureError::WindowUnavailable();
        emit_failure(app, &err, &start_time);
        return Err(err);
    }

    let windows = Window::all().map_err(|e| {
        let err = CaptureError::WgcFailure();
        log::warn!(target: "capture", "Window::all() failed: {:?}", e);
        emit_failure(app, &err, &start_time);
        err
    })?;

    let hwnd_isize = foreground_hwnd.0 as isize;
    let target_window = windows
        .into_iter()
        .find(|w| w.id().unwrap_or(0) as isize == hwnd_isize);

    let target = match target_window {
        Some(w) => w,
        None => {
            let err = CaptureError::InvalidTarget();
            emit_failure(app, &err, &start_time);
            return Err(err);
        }
    };

    // Collect window metadata before capture (moved before capture in case capture consumes target)
    let process_name = target.app_name().ok().map(|s| s.to_string());
    let window_title = target.title().ok().map(|s| s.to_string());
    let win_x = target.x().unwrap_or(0);
    let win_y = target.y().unwrap_or(0);

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
    let asset = crate::asset::Asset {
        id: id.clone(),
        data: bytes,
        width,
        height,
    };

    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(asset);
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
        // monitor_id for a window: not trivially available from xcap — logged as empty with a note.
        monitor_id: String::new(),
        // DPI: xcap does not expose per-window DPI; logged as 0 to distinguish from the legacy 96 hardcode.
        dpi: 0,
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

    Ok(())
}

/// Emit a structured capture.failure event and log diagnostics for any error path.
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
