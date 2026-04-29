use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use crate::capture::errors::CaptureError;

pub fn show(app: &AppHandle) -> Result<(), CaptureError> {
    let window_label = "region-overlay";
    
    // Check if it already exists
    if let Some(_window) = app.get_webview_window(window_label) {
        return Ok(()); // Already open
    }
    
    let builder = WebviewWindowBuilder::new(app, window_label, WebviewUrl::App("/overlay.html".into()))
        .title("XenSnip Region Selection")
        .decorations(false)
        .transparent(true)
        .fullscreen(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false) // No focus stealing
        .disable_drag_drop_handler();
        
    let window = builder.build().map_err(|e| {
        log::error!("Failed to create overlay window: {:?}", e);
        CaptureError::new(crate::capture::errors::CaptureErrorClass::Other, "overlay_create_failed", "Failed to create overlay window.")
    })?;
    
    // Ignore cursor events until the user starts interacting? Wait, if we ignore, how do they click?
    // TDR-003 says: `set_ignore_cursor_events(false)` while selecting. So we must not ignore them.
    let _ = window.set_ignore_cursor_events(false);
    
    Ok(())
}

pub fn close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("region-overlay") {
        let _ = window.close();
    }
}
