use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Shortcut};
use crate::settings::Settings;
use crate::capture::{CaptureSession, CaptureIntent};

pub fn run_region_intent(app: &AppHandle) {
    let session = app.state::<CaptureSession>();
    let start_res = session.start(CaptureIntent::Region);
    
    match start_res {
        Ok(_guard) => {
            // Keep the lock for the overlay flow
            std::mem::forget(_guard);
            if let Err(e) = crate::capture::region::capture_region(app) {
                log::error!(target: "hotkey", "Region overlay creation failed: {:?}", e);
                session.finish();
                app.emit("capture.failure", &e).ok();
            }
        }
        Err(e) => {
            log::warn!(target: "hotkey", "Region capture rejected (busy): {:?}", e);
            app.emit("capture.failure", &e).ok();
        }
    }
}

pub fn run_window_intent(app: &AppHandle) {
    let session = app.state::<CaptureSession>();
    let start_res = session.start(CaptureIntent::ActiveWindow);
    
    match start_res {
        Ok(_guard) => {
            let res = crate::capture::window::capture_active_window(app);
            if let Err(e) = res {
                log::warn!(target: "hotkey", "Window capture failed: {:?}", e);
            }
            // _guard drops here and finishes session
        }
        Err(e) => {
            log::warn!(target: "hotkey", "Window capture rejected (busy): {:?}", e);
            app.emit("capture.failure", &e).ok();
        }
    }
}

pub fn register_hotkeys(app: &AppHandle, settings: &Settings) {
    let region_shortcut: Result<Shortcut, _> = settings.hotkeys.region.parse();
    let window_shortcut: Result<Shortcut, _> = settings.hotkeys.active_window.parse();

    match region_shortcut {
        Ok(shortcut) => {
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        run_region_intent(app);
                    }
                })
                .ok();
        }
        Err(_) => {}
    }

    match window_shortcut {
        Ok(shortcut) => {
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        run_window_intent(app);
                    }
                })
                .ok();
        }
        Err(_) => {}
    }
}
