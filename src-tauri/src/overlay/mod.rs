use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

fn ensure_window(app: &AppHandle) -> Result<tauri::WebviewWindow, CaptureError> {
    let window_label = "region-overlay";

    if let Some(window) = app.get_webview_window(window_label) {
        return Ok(window);
    }

    let builder =
        WebviewWindowBuilder::new(app, window_label, WebviewUrl::App("/overlay.html".into()))
            .title("XenSnip Region Selection")
            .decorations(false)
            .transparent(true)
            .fullscreen(true)
            .always_on_top(true)
            .skip_taskbar(true)
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

pub fn show(app: &AppHandle) -> Result<(), CaptureError> {
    let window = ensure_window(app)?;
    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}

pub fn prewarm(app: &AppHandle) -> Result<(), CaptureError> {
    let window = ensure_window(app)?;
    let _ = window.hide();
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
