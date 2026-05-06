mod asset;
mod autostart;
mod capture;
mod commands;
mod diagnostics;
mod hotkeys;
mod quick_access;
mod settings;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_log::{Target, TargetKind};
use windows::Win32::Graphics::Dwm::{
    DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_WINDOW_CORNER_PREFERENCE,
};

fn parse_asset_id_from_uri(uri: &tauri::http::Uri) -> String {
    if let Some(host) = uri.host() {
        if let Some(stripped) = host.strip_suffix(".localhost") {
            if !stripped.is_empty() {
                return stripped.to_string();
            }
        }

        if host != "localhost" && !host.is_empty() {
            return host.to_string();
        }
    }

    uri.path().trim_matches('/').to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let quit_requested = Arc::new(AtomicBool::new(false));
    let quit_requested_tray = quit_requested.clone();
    let quit_requested_run = quit_requested.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
        // xensnip-asset:// URI scheme — serves raw PNG bytes from the in-memory registry.
        // No ref-count change: read-only transport. Registered before setup().
        .register_uri_scheme_protocol("xensnip-asset", |ctx, request| {
            let asset_id = parse_asset_id_from_uri(request.uri());

            if let Some(data) = ctx.app_handle().state::<asset::AssetRegistry>().get_data(&asset_id) {
                tauri::http::Response::builder()
                    .status(200)
                    .header("Content-Type", "image/png")
                    .header("Access-Control-Allow-Origin", "*")
                    .header("Cache-Control", "no-store")
                    .body(data)
                    .unwrap_or_else(|_| {
                        tauri::http::Response::builder()
                            .status(500)
                            .body(vec![])
                            .unwrap()
                    })
            } else {
                log::warn!(target: "asset", "xensnip-asset:// request for missing asset: {}", asset_id);
                tauri::http::Response::builder()
                    .status(404)
                    .body(vec![])
                    .unwrap()
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Sprint 00 / 02
            commands::app_ping,
            commands::settings_load,
            commands::capture_start_window,
            commands::capture_start_region,
            commands::capture_cancel,
            // Sprint 03
            commands::asset_resolve,
            commands::asset_release,
            commands::asset_read_png,
            commands::quick_access_dismiss,
            commands::quick_access_set_busy,
            commands::clipboard_write_image,
            commands::export_save_media,
            commands::select_export_folder,
            commands::settings_save,
            commands::preset_save,
            commands::preset_delete,
            commands::preset_rename,
            commands::preset_duplicate,
            commands::preset_reorder,
            commands::preset_set_default,
            commands::preset_export_pack,
            commands::preset_import,
            commands::settings_update_last_preset,
            commands::open_settings_window,
        ])
        .setup(|app| {
            app.manage(capture::CaptureSession::new());
            app.manage(asset::AssetRegistry::new());
            app.manage(quick_access::BusyRegistry::new());
            app.manage(quick_access::ActiveAsset::new());

            let app_handle = app.handle();
            let settings = settings::load_or_create_default(app_handle);
            log::info!(target: "app", "Settings initialized: {:?}", settings);

            let warnings = hotkeys::register_hotkeys(app_handle, &settings);
            if !warnings.is_empty() {
                log::warn!(target: "app", "Some hotkeys failed to register at startup: {:?}", warnings);
            }

            autostart::sync(app_handle, settings.launch_at_startup);

            // Tray menu
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let region_i = MenuItem::with_id(app, "region", "Region capture", true, None::<&str>)?;
            let window_i = MenuItem::with_id(app, "window", "Window capture", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[
                &region_i,
                &window_i,
                &PredefinedMenuItem::separator(app)?,
                &settings_i,
                &PredefinedMenuItem::separator(app)?,
                &quit_i,
            ])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app: &AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        log::info!(target: "app", "Quit clicked");
                        quit_requested_tray.store(true, Ordering::Relaxed);
                        app.exit(0);
                    }
                    "region" => {
                        log::info!(target: "tray", "Region capture clicked");
                        hotkeys::run_region_intent(app);
                    }
                    "window" => {
                        log::info!(target: "tray", "Window capture clicked");
                        hotkeys::run_window_intent(app);
                    }
                    "settings" => {
                        log::info!(target: "tray", "Open settings clicked");
                        let _ = open_settings_window(app);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        quick_access::focus_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Log the actual log directory path so DIAG-01 can be verified.
            if let Ok(log_dir) = app.path().app_log_dir() {
                log::info!(target: "app", "Log directory: {}", log_dir.display());
            }

            log::info!(target: "app", "XenSnip initialized (Sprint 06)");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(move |_app_handle, event| {
            // Prevent exit when all windows close so the tray stays alive.
            // Allow exit only when the user explicitly clicks Quit from the tray.
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if !quit_requested_run.load(Ordering::Relaxed) {
                    api.prevent_exit();
                }
            }
        });
}

pub fn open_settings_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        lift_window_z_order(&window);
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("XenSnip Settings")
    .inner_size(400.0, 680.0) 
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .focused(true)
    .build()?;

    let _ = apply_window_native_style(&window);
    lift_window_z_order(&window);

    Ok(())
}

fn lift_window_z_order(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        let _ = window.set_always_on_top(true);
        let _ = window.set_always_on_top(false);
    }
}

pub fn apply_window_native_style(window: &WebviewWindow) -> tauri::Result<()> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = window.hwnd() {
            // Force border color to Midnight Blue (#0f172a) to hide the Windows 11 accent border.
            // COLORREF is 0x00BBGGRR -> #0f172a is R:0x0f, G:0x17, B:0x2a -> 0x002a170f
            let color: u32 = 0x002a170f;
            unsafe {
                let hwnd = windows::Win32::Foundation::HWND(hwnd.0);
                // 1. Force border color to Midnight Blue
                let _ = DwmSetWindowAttribute(
                    hwnd,
                    DWMWA_BORDER_COLOR,
                    &color as *const u32 as *const _,
                    std::mem::size_of::<u32>() as u32,
                );

                // 2. Force rounded corners (DWMWCP_ROUND = 2)
                let corner_preference = 2u32;
                let _ = DwmSetWindowAttribute(
                    hwnd,
                    DWMWA_WINDOW_CORNER_PREFERENCE,
                    &corner_preference as *const u32 as *const _,
                    std::mem::size_of::<u32>() as u32,
                );
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::parse_asset_id_from_uri;

    #[test]
    fn parses_asset_id_from_localhost_host_suffix() {
        let uri: tauri::http::Uri = "xensnip-asset://win_123.localhost/".parse().unwrap();
        assert_eq!(parse_asset_id_from_uri(&uri), "win_123");
    }

    #[test]
    fn parses_asset_id_from_localhost_path() {
        let uri: tauri::http::Uri = "xensnip-asset://localhost/win_123".parse().unwrap();
        assert_eq!(parse_asset_id_from_uri(&uri), "win_123");
    }

    #[test]
    fn parses_asset_id_from_plain_host() {
        let uri: tauri::http::Uri = "xensnip-asset://win_123".parse().unwrap();
        assert_eq!(parse_asset_id_from_uri(&uri), "win_123");
    }
}
