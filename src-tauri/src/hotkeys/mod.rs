use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Shortcut};
use crate::settings::Settings;
use crate::capture::{CaptureSession, CaptureIntent};
use crate::capture::errors::CaptureError;

/// Shared helper: run region intent (show overlay). Called by both hotkey and tray paths.
/// Acquires session lock, shows overlay, releases on failure.
pub fn run_region_intent(app: &AppHandle, session: &Arc<CaptureSession>) {
    if let Err(e) = session.start(CaptureIntent::Region) {
        log::warn!(target: "hotkey", "Region capture rejected (busy): {:?}", e);
        app.emit("capture.failure", &e).ok();
        return;
    }
    if let Err(e) = crate::capture::region::capture_region(app) {
        log::error!(target: "hotkey", "Region overlay creation failed: {:?}", e);
        session.finish();
        app.emit("capture.failure", &e).ok();
    }
    // On success: overlay is open, session stays locked until capture.region.confirm or capture.cancel.
}

/// Shared helper: run active-window intent. Called by both hotkey and tray paths.
/// Acquires session lock, captures, always releases lock.
pub fn run_window_intent(app: &AppHandle, session: &Arc<CaptureSession>) {
    if let Err(e) = session.start(CaptureIntent::ActiveWindow) {
        log::warn!(target: "hotkey", "Window capture rejected (busy): {:?}", e);
        app.emit("capture.failure", &e).ok();
        return;
    }
    let res = crate::capture::window::capture_active_window(app);
    // Always release — failure emits capture.failure from inside capture_active_window already.
    session.finish();
    if let Err(e) = res {
        log::warn!(target: "hotkey", "Window capture failed: {:?}", e);
        // failure already emitted inside capture_active_window; log here for hotkey context.
    }
}

pub fn register_hotkeys(app: &AppHandle, settings: &Settings, session: Arc<CaptureSession>) {
    let region_shortcut: Result<Shortcut, _> = settings.hotkeys.region.parse();
    let window_shortcut: Result<Shortcut, _> = settings.hotkeys.active_window.parse();

    // Region hotkey
    match region_shortcut {
        Ok(shortcut) => {
            let session_clone = session.clone();
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        log::info!(target: "hotkey", "Region capture hotkey pressed");
                        run_region_intent(app, &session_clone);
                    }
                })
                .unwrap_or_else(|e| {
                    log::error!(target: "hotkey", "Failed to register region hotkey: {:?}", e);
                });
        }
        Err(e) => {
            let err = CaptureError::new(
                crate::capture::errors::CaptureErrorClass::Other,
                "hotkey_parse_failed",
                &format!("Region hotkey '{}' is invalid: {}", settings.hotkeys.region, e),
            );
            log::error!(
                target: "hotkey",
                "HOTKEY-03: Region hotkey parse failed for '{}': {}",
                settings.hotkeys.region,
                e
            );
            // Emit so a future UI consumer can surface the error; app continues.
            app.emit("capture.failure", &err).ok();
        }
    }

    // Active-window hotkey
    match window_shortcut {
        Ok(shortcut) => {
            let session_clone = session.clone();
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        log::info!(target: "hotkey", "Active window capture hotkey pressed");
                        run_window_intent(app, &session_clone);
                    }
                })
                .unwrap_or_else(|e| {
                    log::error!(target: "hotkey", "Failed to register active-window hotkey: {:?}", e);
                });
        }
        Err(e) => {
            let err = CaptureError::new(
                crate::capture::errors::CaptureErrorClass::Other,
                "hotkey_parse_failed",
                &format!(
                    "Active-window hotkey '{}' is invalid: {}",
                    settings.hotkeys.active_window, e
                ),
            );
            log::error!(
                target: "hotkey",
                "HOTKEY-03: Active-window hotkey parse failed for '{}': {}",
                settings.hotkeys.active_window,
                e
            );
            app.emit("capture.failure", &err).ok();
        }
    }
}
