use crate::asset::{AssetRegistry, AssetResolveResult};
use crate::capture::CaptureSession;
use crate::settings::{load_or_create_default, Settings, SavedPreset};
use std::collections::HashMap;
use std::sync::mpsc;
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
pub async fn open_settings_window(app_handle: AppHandle) -> Result<(), String> {
    let app = app_handle.clone();
    let (tx, rx) = mpsc::channel();

    app_handle
        .run_on_main_thread(move || {
            let result = crate::open_settings_window(&app).map_err(|e| e.to_string());
            let _ = tx.send(result);
        })
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn_blocking(move || {
        rx.recv().map_err(|e| e.to_string())?
    })
    .await
    .map_err(|e| e.to_string())?
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
pub fn capture_cancel(app_handle: AppHandle) -> Result<(), String> {
    crate::capture::native_region_selector::close_active();
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

fn preset_name_exists(saved_presets: &[SavedPreset], candidate: &str, exclude_id: Option<&str>) -> bool {
    saved_presets
        .iter()
        .any(|preset| preset.name == candidate && exclude_id != Some(preset.id.as_str()))
}

fn next_copy_name(saved_presets: &[SavedPreset], source_name: &str) -> String {
    let trimmed = source_name.trim();
    let first_candidate = format!("{} (Copy)", trimmed);
    if !preset_name_exists(saved_presets, &first_candidate, None) {
        return first_candidate;
    }

    let mut counter = 2;
    loop {
        let candidate = format!("{} (Copy {})", trimmed, counter);
        if !preset_name_exists(saved_presets, &candidate, None) {
            return candidate;
        }
        counter += 1;
    }
}

fn next_import_name(saved_presets: &[SavedPreset], source_name: &str) -> String {
    let trimmed = source_name.trim();
    if !preset_name_exists(saved_presets, trimmed, None) {
        return trimmed.to_string();
    }

    let mut counter = 2;
    loop {
        let candidate = format!("{} ({})", trimmed, counter);
        if !preset_name_exists(saved_presets, &candidate, None) {
            return candidate;
        }
        counter += 1;
    }
}

#[tauri::command]
pub fn preset_save(app_handle: AppHandle, mut saved_preset: SavedPreset) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    let preset_name = saved_preset.name.trim().to_string();

    if preset_name.is_empty() {
        return Err("Preset name cannot be empty.".to_string());
    }

    saved_preset.name = preset_name.clone();
    saved_preset.updated_at = chrono::Utc::now().to_rfc3339();

    // Upsert by name as per V1 overwrite rule
    if let Some(existing) = settings.saved_presets.iter_mut().find(|p| p.name == preset_name) {
        existing.name = saved_preset.name.clone();
        existing.preset = saved_preset.preset;
        existing.updated_at = saved_preset.updated_at;
    } else {
        settings.saved_presets.push(saved_preset);
    }

    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn preset_rename(app_handle: AppHandle, preset_id: String, new_name: String) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    let new_name = new_name.trim();
    if new_name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }

    if preset_name_exists(&settings.saved_presets, new_name, Some(preset_id.as_str())) {
        return Err("A preset with this name already exists".to_string());
    }

    if let Some(p) = settings.saved_presets.iter_mut().find(|p| p.id == preset_id) {
        p.name = new_name.to_string();
        p.updated_at = chrono::Utc::now().to_rfc3339();
        crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Preset not found".to_string())
    }
}

#[tauri::command]
pub fn preset_duplicate(app_handle: AppHandle, preset_id: String) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    let maybe_preset = settings.saved_presets.iter().find(|p| p.id == preset_id).cloned();

    if let Some(mut p) = maybe_preset {
        p.id = uuid::Uuid::new_v4().to_string();
        p.name = next_copy_name(&settings.saved_presets, &p.name);
        p.updated_at = chrono::Utc::now().to_rfc3339();
        settings.saved_presets.push(p);
        crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Preset not found".to_string())
    }
}

#[tauri::command]
pub fn preset_reorder(app_handle: AppHandle, preset_ids: Vec<String>) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    if preset_ids.len() != settings.saved_presets.len() {
        return Err("Preset reorder payload is incomplete".to_string());
    }

    let mut remaining: HashMap<String, SavedPreset> = std::mem::take(&mut settings.saved_presets)
        .into_iter()
        .map(|preset| (preset.id.clone(), preset))
        .collect();
    let mut new_list = Vec::with_capacity(preset_ids.len());

    for id in preset_ids {
        if let Some(preset) = remaining.remove(&id) {
            new_list.push(preset);
        } else {
            return Err("Preset reorder payload contains unknown or duplicate ids".to_string());
        }
    }

    if !remaining.is_empty() {
        return Err("Preset reorder payload omitted one or more presets".to_string());
    }

    settings.saved_presets = new_list;
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn preset_set_default(app_handle: AppHandle, preset_id: Option<String>) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    if let Some(id) = preset_id.as_ref() {
        if !settings.saved_presets.iter().any(|preset| preset.id == *id) {
            return Err("Preset not found".to_string());
        }
    }
    settings.default_preset_id = preset_id;
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
pub fn preset_delete(app_handle: AppHandle, preset_id: String) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    settings.saved_presets.retain(|p| p.id != preset_id);
    
    // Cleanup default pointer if needed
    if settings.default_preset_id.as_deref() == Some(&preset_id) {
        settings.default_preset_id = None;
    }
    
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn preset_export_pack(app_handle: AppHandle, preset_ids: Vec<String>) -> Result<bool, String> {
    let settings = load_or_create_default(&app_handle);
    let to_export: Vec<SavedPreset> = settings.saved_presets.iter()
        .filter(|p| preset_ids.contains(&p.id))
        .cloned()
        .collect();

    if to_export.is_empty() {
        return Err("No presets selected for export".to_string());
    }

    let is_single = to_export.len() == 1;
    let default_name = if is_single {
        format!("{}.xensnip-preset.json", to_export[0].name)
    } else {
        "presets-pack.xensnip-presets.json".to_string()
    };

    let maybe_path = app_handle
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("XenSnip Presets", if is_single { &["xensnip-preset.json"] } else { &["xensnip-presets.json"] })
        .blocking_save_file();

    if let Some(path) = maybe_path {
        let export_data = serde_json::json!({
            "schema_version": 1,
            "kind": if is_single { "single" } else { "pack" },
            "app": "xensnip",
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "presets": to_export
        });

        let content = serde_json::to_string_pretty(&export_data).map_err(|e| e.to_string())?;
        std::fs::write(path.into_path().map_err(|_| "Invalid path".to_string())?, content).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn preset_import(app_handle: AppHandle) -> Result<usize, String> {
    let maybe_path = app_handle
        .dialog()
        .file()
        .add_filter("XenSnip Presets", &["xensnip-preset.json", "xensnip-presets.json"])
        .blocking_pick_file();

    if let Some(path) = maybe_path {
        let content = std::fs::read_to_string(path.into_path().map_err(|_| "Invalid path".to_string())?).map_err(|e| e.to_string())?;
        let data: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {}", e))?;

        if data["app"] != "xensnip" {
            return Err("Not a XenSnip preset file".to_string());
        }

        let presets_val = data["presets"].as_array().ok_or("Invalid file format: missing presets array")?;
        let mut settings = load_or_create_default(&app_handle);
        let mut imported_count = 0;

        for p_val in presets_val {
            if let Ok(mut imported_preset) = serde_json::from_value::<SavedPreset>(p_val.clone()) {
                // Conflict rule: generate new ID, append suffix if name exists
                imported_preset.id = uuid::Uuid::new_v4().to_string();
                imported_preset.name = next_import_name(&settings.saved_presets, &imported_preset.name);
                imported_preset.updated_at = chrono::Utc::now().to_rfc3339();

                settings.saved_presets.push(imported_preset);
                imported_count += 1;
            }
        }

        if imported_count == 0 && !presets_val.is_empty() {
            return Err("No valid presets found in file".to_string());
        }

        if imported_count > 0 {
            crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
        }
        Ok(imported_count)
    } else {
        Ok(0)
    }
}

#[tauri::command]
pub fn settings_update_last_preset(app_handle: AppHandle, preset: serde_json::Value) -> Result<(), String> {
    let mut settings = load_or_create_default(&app_handle);
    settings.last_preset = Some(preset);
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}
