use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

fn ensure_window(
    app: &AppHandle,
    monitor: &xcap::Monitor,
) -> Result<tauri::WebviewWindow, CaptureError> {
    let monitor_id = monitor.id().map(|id| id.to_string()).map_err(|e| {
        log::error!("Failed to get monitor ID: {:?}", e);
        CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "monitor_id_missing",
            "Monitor identity could not be established.",
        )
    })?;

    // Sanitize label for Tauri: allow alphanumeric, -, /, :, _
    let sanitized_id = monitor_id.replace(
        |c: char| !c.is_alphanumeric() && c != '-' && c != '/' && c != ':' && c != '_',
        "_",
    );
    let window_label = format!("region-overlay-{}", sanitized_id);

    if let Some(window) = app.get_webview_window(&window_label) {
        return Ok(window);
    }

    let scale_factor = monitor.scale_factor().unwrap_or(1.0) as f64;

    // xcap returns physical pixels. Tauri builder expects logical pixels.
    let x = (monitor.x().unwrap_or(0) as f64 / scale_factor).round();
    let y = (monitor.y().unwrap_or(0) as f64 / scale_factor).round();
    let w = (monitor.width().unwrap_or(1920) as f64 / scale_factor).round();
    let h = (monitor.height().unwrap_or(1080) as f64 / scale_factor).round();

    let url = format!("/overlay.html?monitor={}", urlencoding::encode(&monitor_id));

    let builder = WebviewWindowBuilder::new(app, &window_label, WebviewUrl::App(url.into()))
        .title("XenSnip Region Selection")
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .position(x, y)
        .inner_size(w, h)
        .focused(true)
        .visible(false)
        .disable_drag_drop_handler();

    let window = builder.build().map_err(|e| {
        log::error!("Failed to create overlay window: {:?}", e);
        CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "overlay_create_failed",
            "Failed to create overlay window.",
        )
    })?;

    let _ = window.set_ignore_cursor_events(false);
    Ok(window)
}

pub fn show_all(app: &AppHandle, monitors: Vec<xcap::Monitor>) -> Result<(), CaptureError> {
    for monitor in monitors {
        let window = ensure_window(app, &monitor)?;
        let _ = window.show();
        let _ = window.set_focus();
    }

    Ok(())
}

pub fn hide_all(app: &AppHandle) {
    for window in app.webview_windows().values() {
        if window.label().starts_with("region-overlay") {
            let _ = window.hide();
        }
    }
}

pub fn close_all(app: &AppHandle) {
    for window in app.webview_windows().values() {
        if window.label().starts_with("region-overlay") {
            let _ = window.close();
        }
    }
}

pub fn close(app: &AppHandle) {
    close_all(app);
}
