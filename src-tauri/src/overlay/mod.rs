use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn show(app: &AppHandle) -> Result<(), CaptureError> {
    let window_label = "region-overlay";

    // Reuse the existing overlay window if it was previously hidden.
    if let Some(window) = app.get_webview_window(window_label) {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let builder =
        WebviewWindowBuilder::new(app, window_label, WebviewUrl::App("/overlay.html".into()))
            .title("XenSnip Region Selection")
            .decorations(false)
            .transparent(true)
            .fullscreen(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(true) // Set focus to enable keyboard events (ESC key)
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
    let _ = window.set_focus(); // Explicitly request focus

    Ok(())
}

pub fn close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("region-overlay") {
        let _ = window.close();
    }
}

pub fn hide(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("region-overlay") {
        let _ = window.hide();
    }
}
