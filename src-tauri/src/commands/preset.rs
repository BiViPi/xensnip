use crate::settings::{load_or_create_default, SavedPreset};
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

// ── Private helpers ──────────────────────────────────────────────────────────

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

// ── Public commands ──────────────────────────────────────────────────────────

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
