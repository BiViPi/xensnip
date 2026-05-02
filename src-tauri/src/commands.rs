use crate::asset::{AssetRegistry, AssetResolveResult};
use crate::capture::CaptureSession;
use crate::settings::{load_or_create_default, Settings, SavedPreset};
use tauri::image::Image;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

#[derive(serde::Serialize)]
pub struct PingResponse {
    pub version: String,
    pub name: String,
}

#[tauri::command]
pub fn app_ping() -> PingResponse {
    PingResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
    }
}

#[tauri::command]
pub fn settings_load(app_handle: AppHandle) -> Settings {
    load_or_create_default(&app_handle)
}

#[tauri::command]
pub fn capture_start_region(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<CaptureSession>();
    session
        .start_persistent(crate::capture::CaptureIntent::Region)
        .map_err(|e| format!("{:?}", e))?;

    match crate::capture::region::capture_region(&app_handle) {
        Ok(()) => Ok(()),
        Err(err) => {
            session.finish();
            Err(format!("{:?}", err))
        }
    }
}

#[tauri::command]
pub fn capture_start_window(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<CaptureSession>();
    let _guard = session
        .start(crate::capture::CaptureIntent::ActiveWindow)
        .map_err(|e| format!("{:?}", e))?;
    crate::capture::window::capture_active_window(&app_handle).map_err(|e| format!("{:?}", e))
}

#[tauri::command]
pub fn capture_region_confirm(
    app_handle: AppHandle,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
    monitor_id: String,
) -> Result<(), String> {
    crate::capture::region::finish_region_capture(&app_handle, x, y, w, h, monitor_id)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
pub fn capture_cancel(app_handle: AppHandle) -> Result<(), String> {
    crate::overlay::close(&app_handle);
    if let Some(session) = app_handle.try_state::<CaptureSession>() {
        session.finish();
    }
    Ok(())
}

#[tauri::command]
pub fn asset_resolve(
    app_handle: AppHandle,
    asset_id: String,
    consumer: String,
) -> Result<AssetResolveResult, String> {
    let registry = app_handle.state::<AssetRegistry>();
    registry
        .resolve(&asset_id, &consumer)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn asset_release(
    app_handle: AppHandle,
    asset_id: String,
    consumer: String,
) -> Result<(), String> {
    let registry = app_handle.state::<AssetRegistry>();
    registry
        .release(&asset_id, &consumer)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn asset_read_png(app_handle: AppHandle, asset_id: String) -> Result<Vec<u8>, String> {
    let registry = app_handle.state::<AssetRegistry>();
    registry
        .get_data(&asset_id)
        .ok_or_else(|| "Asset not found or already dropped.".to_string())
}

#[tauri::command]
pub fn clipboard_write_image(app_handle: AppHandle, png_bytes: Vec<u8>) -> Result<(), String> {
    let decoded = image::load_from_memory(&png_bytes).map_err(|e| e.to_string())?;
    let rgba = decoded.to_rgba8();
    let image = Image::new_owned(rgba.into_raw(), decoded.width(), decoded.height());
    app_handle
        .clipboard()
        .write_image(&image)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_save_media(
    _app_handle: AppHandle,
    bytes: Vec<u8>,
    folder_path: String,
    filename: String,
) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut path = std::path::PathBuf::from(folder_path);
        path.push(filename);

        let mut final_path = path.clone();
        let mut counter = 1;
        while final_path.exists() {
            let stem = path.file_stem().unwrap_or_default().to_string_lossy();
            let ext = path.extension().unwrap_or_default().to_string_lossy();
            let new_filename = format!("{} ({}).{}", stem, counter, ext);
            final_path = path.with_file_name(new_filename);
            counter += 1;
        }

        std::fs::write(final_path, bytes).map_err(|e| e.to_string())?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn select_export_folder(app_handle: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let maybe_path = app_handle
            .dialog()
            .file()
            .blocking_pick_folder();

        match maybe_path {
            Some(path) => Ok(Some(path.into_path().map_err(|_| "Invalid path".to_string())?.to_string_lossy().into_owned())),
            None => Ok(None),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn settings_save(
    app_handle: AppHandle,
    new_settings: Settings,
) -> Result<crate::settings::SettingsSaveResult, crate::settings::SettingsSaveError> {
    log::info!(
        target: "settings",
        "settings_save requested: region={:?}, active_window={:?}, launch_at_startup={}",
        new_settings.hotkeys.region,
        new_settings.hotkeys.active_window,
        new_settings.launch_at_startup,
    );

    // 1. Validate hotkeys
    let _: tauri_plugin_global_shortcut::Shortcut = new_settings
        .hotkeys
        .region
        .parse()
        .map_err(|_| crate::settings::SettingsSaveError::InvalidHotkey {
            field: "region".to_string(),
            value: new_settings.hotkeys.region.clone(),
        })?;

    let _: tauri_plugin_global_shortcut::Shortcut = new_settings
        .hotkeys
        .active_window
        .parse()
        .map_err(|_| crate::settings::SettingsSaveError::InvalidHotkey {
            field: "active_window".to_string(),
            value: new_settings.hotkeys.active_window.clone(),
        })?;

    // 2. Load old settings for change detection (logging only)
    let old_settings = crate::settings::load_or_create_default(&app_handle);
    let hotkeys_changed = old_settings.hotkeys.region != new_settings.hotkeys.region
        || old_settings.hotkeys.active_window != new_settings.hotkeys.active_window;
    let autostart_changed = old_settings.launch_at_startup != new_settings.launch_at_startup;

    // 3. Write to file
    crate::settings::save_settings(&app_handle, &new_settings).map_err(|e| {
        log::error!(target: "settings", "settings_save write failure: {}", e);
        crate::settings::SettingsSaveError::WriteError {
            message: e.to_string(),
        }
    })?;

    // 4. Re-register hotkeys
    let warnings = crate::hotkeys::re_register(&app_handle, &new_settings);

    // 5. Sync autostart
    crate::autostart::sync(&app_handle, new_settings.launch_at_startup);

    // 6. Log success
    log::info!(
        target: "settings",
        "settings.saved {{ version: {}, hotkeys_changed: {}, autostart_changed: {} }}",
        new_settings.version,
        hotkeys_changed,
        autostart_changed
    );

    Ok(crate::settings::SettingsSaveResult { warnings })
}

#[tauri::command]
pub fn quick_access_dismiss(app_handle: AppHandle, asset_id: String) -> Result<(), String> {
    crate::quick_access::dismiss(&app_handle, &asset_id);
    Ok(())
}

#[tauri::command]
pub fn quick_access_set_busy(app_handle: AppHandle, asset_id: String, busy: bool) -> Result<(), String> {
    if let Some(registry) = app_handle.try_state::<crate::quick_access::BusyRegistry>() {
        registry.set_busy(asset_id, busy);
    }
    Ok(())
}

#[tauri::command]
pub fn preset_save(app_handle: AppHandle, saved_preset: SavedPreset) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    
    // Upsert by name as per V1 overwrite rule
    if let Some(existing) = settings.saved_presets.iter_mut().find(|p| p.name == saved_preset.name) {
        existing.preset = saved_preset.preset;
        existing.id = saved_preset.id; 
    } else {
        settings.saved_presets.push(saved_preset);
    }
    
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn preset_delete(app_handle: AppHandle, preset_id: String) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    settings.saved_presets.retain(|p| p.id != preset_id);
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn settings_update_last_preset(app_handle: AppHandle, preset: serde_json::Value) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    settings.last_preset = Some(preset);
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}
