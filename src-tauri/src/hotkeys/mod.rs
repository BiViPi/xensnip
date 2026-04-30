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

pub fn register_hotkeys(app: &AppHandle, settings: &Settings) -> Vec<crate::settings::HotkeyWarning> {
    let mut warnings = Vec::new();

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
                log::warn!(target: "hotkeys", "hotkeys.register_failed {{ field: \"region\", shortcut: \"{}\", error: \"{:?}\" }}", settings.hotkeys.region, err);
                warnings.push(crate::settings::HotkeyWarning {
                    field: "region".to_string(),
                    shortcut: settings.hotkeys.region.clone(),
                });
            }
        }
        Err(err) => {
            log::error!(target: "hotkeys", "Invalid region hotkey '{}': {:?}", settings.hotkeys.region, err);
            // Validation should catch this before calling register_hotkeys, but we log anyway.
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
                log::warn!(target: "hotkeys", "hotkeys.register_failed {{ field: \"active_window\", shortcut: \"{}\", error: \"{:?}\" }}", settings.hotkeys.active_window, err);
                warnings.push(crate::settings::HotkeyWarning {
                    field: "active_window".to_string(),
                    shortcut: settings.hotkeys.active_window.clone(),
                });
            }
        }
        Err(err) => {
            log::error!(target: "hotkeys", "Invalid active-window hotkey '{}': {:?}", settings.hotkeys.active_window, err);
        }
    }

    warnings
}

pub fn re_register(app: &AppHandle, settings: &Settings) -> Vec<crate::settings::HotkeyWarning> {
    if let Err(e) = app.global_shortcut().unregister_all() {
        log::error!(target: "hotkeys", "Failed to unregister all shortcuts: {:?}", e);
    }
    register_hotkeys(app, settings)
}
