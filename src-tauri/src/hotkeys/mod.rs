use crate::capture::{CaptureIntent, CaptureSession};
use crate::settings::Settings;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub fn run_region_intent(app: &AppHandle) {
    let session = app.state::<CaptureSession>();
    let start_res = session.start_persistent(CaptureIntent::Region);

    match start_res {
        Ok(()) => {
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
            if let Err(err) =
                app.global_shortcut()
                    .on_shortcut(shortcut, move |app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            run_region_intent(app);
                        }
                    })
            {
                log::error!(target: "hotkey", "Failed to register region hotkey '{}': {:?}", settings.hotkeys.region, err);
            }
        }
        Err(err) => {
            log::error!(target: "hotkey", "Invalid region hotkey '{}': {:?}", settings.hotkeys.region, err);
        }
    }

    match window_shortcut {
        Ok(shortcut) => {
            if let Err(err) =
                app.global_shortcut()
                    .on_shortcut(shortcut, move |app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            run_window_intent(app);
                        }
                    })
            {
                log::error!(target: "hotkey", "Failed to register active-window hotkey '{}': {:?}", settings.hotkeys.active_window, err);
            }
        }
        Err(err) => {
            log::error!(target: "hotkey", "Invalid active-window hotkey '{}': {:?}", settings.hotkeys.active_window, err);
        }
    }
}
