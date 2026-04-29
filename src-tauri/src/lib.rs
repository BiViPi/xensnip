mod asset;
mod capture;
mod commands;
mod diagnostics;
mod hotkeys;
mod overlay;
mod settings;

use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Emitter};
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("xensnip".to_string()),
                    }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::app_ping,
            commands::settings_load,
            commands::capture_active_window,
            commands::finish_region_capture
        ])
        .setup(|app| {
            // Initialize CaptureSession and AssetRegistry
            let session = Arc::new(capture::CaptureSession::new());
            let asset_registry = Arc::new(asset::AssetRegistry::new());
            app.manage(session.clone());
            app.manage(asset_registry);

            // Workstream E: Settings schema v0 with load_or_create_default
            let settings = settings::load_or_create_default(app.handle());
            log::info!(target: "app", "Settings initialized: {:?}", settings);

            // Register global hotkeys
            hotkeys::register_hotkeys(app.handle(), &settings, session.clone());

            // Workstream B: Tray baseline
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let region_i = MenuItem::with_id(app, "region", "Region capture", true, None::<&str>)?;
            let window_i = MenuItem::with_id(app, "window", "Window capture", true, None::<&str>)?;
            let editor_i = MenuItem::with_id(app, "editor", "Open editor (stub)", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Open settings (stub)", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[
                &region_i,
                &window_i,
                &PredefinedMenuItem::separator(app)?,
                &editor_i,
                &settings_i,
                &PredefinedMenuItem::separator(app)?,
                &quit_i,
            ])?;

            let session_clone_tray = session.clone();

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |app: &AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        log::info!(target: "app", "Quit clicked");
                        app.exit(0);
                    }
                    "region" => {
                        log::info!(target: "tray", "Region capture clicked");
                        if let Err(e) = session_clone_tray.start(capture::CaptureIntent::Region) {
                            log::warn!(target: "tray", "Region capture rejected: {:?}", e);
                            let _ = app.emit("capture.failure", e);
                        } else {
                            let _ = capture::region::capture_region(app);
                        }
                    }
                    "window" => {
                        log::info!(target: "tray", "Window capture clicked");
                        if let Err(e) = session_clone_tray.start(capture::CaptureIntent::ActiveWindow) {
                            log::warn!(target: "tray", "Active window capture rejected: {:?}", e);
                            let _ = app.emit("capture.failure", e);
                        } else {
                            let _ = capture::window::capture_active_window(app);
                            session_clone_tray.finish();
                        }
                    }
                    "editor" => {
                        log::info!(target: "tray", "Open editor clicked");
                    }
                    "settings" => {
                        log::info!(target: "tray", "Open settings clicked");
                    }
                    _ => {}
                })
                .on_tray_icon_event(|_tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        // Potential toggle behavior in later sprints
                    }
                })
                .build(app)?;

            log::info!(target: "app", "XenSnip baseline initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
