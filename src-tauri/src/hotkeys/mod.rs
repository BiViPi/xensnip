use std::sync::Arc;
use tauri::{AppHandle, Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Shortcut};
use crate::settings::Settings;
use crate::capture::{CaptureSession, CaptureIntent};

pub fn register_hotkeys(app: &AppHandle, settings: &Settings, session: Arc<CaptureSession>) {
    let region_shortcut = settings.hotkeys.region.parse::<Shortcut>();
    let window_shortcut = settings.hotkeys.active_window.parse::<Shortcut>();
    
    let _app_clone = app.clone();
    let session_clone = session.clone();
    
    app.global_shortcut().on_shortcut(
        region_shortcut.unwrap(),
        move |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                log::info!(target: "hotkey", "Region capture hotkey pressed");
                if let Err(e) = session_clone.start(CaptureIntent::Region) {
                    log::warn!(target: "hotkey", "Region capture rejected: {:?}", e);
                    // Emit event to frontend to show error
                    let _ = app.emit("capture.failure", e);
                } else {
                    let _ = crate::capture::region::capture_region(app);
                }
            }
        }
    ).unwrap_or_else(|e| log::error!("Failed to register region hotkey: {:?}", e));
    
    let _app_clone = app.clone();
    let session_clone = session.clone();
    
    app.global_shortcut().on_shortcut(
        window_shortcut.unwrap(),
        move |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                log::info!(target: "hotkey", "Active window capture hotkey pressed");
                if let Err(e) = session_clone.start(CaptureIntent::ActiveWindow) {
                    log::warn!(target: "hotkey", "Active window capture rejected: {:?}", e);
                    let _ = app.emit("capture.failure", e);
                } else {
                    let _ = crate::capture::window::capture_active_window(app);
                    session_clone.finish(); // Finish immediately for window capture for now
                }
            }
        }
    ).unwrap_or_else(|e| log::error!("Failed to register active window hotkey: {:?}", e));
}
