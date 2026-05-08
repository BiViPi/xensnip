use crate::settings::{load_or_create_default, SavedPreset};
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use serde::Serialize;

#[derive(Serialize)]
pub struct PresetImportResult {
    pub imported: usize,
    pub skipped: usize,
}

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
pub async fn preset_import(app_handle: AppHandle) -> Result<PresetImportResult, String> {
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
        
        const MAX_IMPORT_COUNT: usize = 100;
        if presets_val.len() > MAX_IMPORT_COUNT {
            return Err(format!(
                "Preset pack too large: contains {} presets, maximum is {}",
                presets_val.len(), MAX_IMPORT_COUNT
            ));
        }

        let mut settings = load_or_create_default(&app_handle);
        let mut imported_count = 0;
        let mut skipped_count = 0;

        for p_val in presets_val {
            if let Ok(mut imported_preset) = serde_json::from_value::<SavedPreset>(p_val.clone()) {
                // Conflict rule: generate new ID, append suffix if name exists
                imported_preset.id = uuid::Uuid::new_v4().to_string();
                imported_preset.name = next_import_name(&settings.saved_presets, &imported_preset.name);
                imported_preset.updated_at = chrono::Utc::now().to_rfc3339();

                settings.saved_presets.push(imported_preset);
                imported_count += 1;
            } else {
                skipped_count += 1;
            }
        }

        if imported_count == 0 && !presets_val.is_empty() {
            return Err("No valid presets found in file".to_string());
        }

        if imported_count > 0 {
            crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
        }

        Ok(PresetImportResult {
            imported: imported_count,
            skipped: skipped_count,
        })
    } else {
        Ok(PresetImportResult { imported: 0, skipped: 0 })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_preset(id: &str, name: &str) -> SavedPreset {
        SavedPreset {
            id: id.to_string(),
            name: name.to_string(),
            preset: serde_json::Value::Null,
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn preset_name_exists_detects_matching_name() {
        let presets = vec![make_preset("a", "Alpha"), make_preset("b", "Beta")];
        assert!(preset_name_exists(&presets, "Alpha", None));
        assert!(preset_name_exists(&presets, "Beta", None));
        assert!(!preset_name_exists(&presets, "Gamma", None));
    }

    #[test]
    fn preset_name_exists_excludes_the_given_id() {
        let presets = vec![make_preset("a", "Alpha")];
        // Excluding "a" means a rename to the same name should be allowed.
        assert!(!preset_name_exists(&presets, "Alpha", Some("a")));
        // But excluding a different id still finds the conflict.
        assert!(preset_name_exists(&presets, "Alpha", Some("b")));
    }

    #[test]
    fn next_copy_name_appends_copy_when_name_is_free() {
        let presets = vec![make_preset("a", "Alpha")];
        assert_eq!(next_copy_name(&presets, "Alpha"), "Alpha (Copy)");
    }

    #[test]
    fn next_copy_name_uses_numbered_suffix_when_copy_is_taken() {
        let presets = vec![
            make_preset("a", "Alpha"),
            make_preset("b", "Alpha (Copy)"),
        ];
        assert_eq!(next_copy_name(&presets, "Alpha"), "Alpha (Copy 2)");
    }

    #[test]
    fn next_copy_name_increments_until_free() {
        let presets = vec![
            make_preset("a", "Alpha"),
            make_preset("b", "Alpha (Copy)"),
            make_preset("c", "Alpha (Copy 2)"),
            make_preset("d", "Alpha (Copy 3)"),
        ];
        assert_eq!(next_copy_name(&presets, "Alpha"), "Alpha (Copy 4)");
    }

    #[test]
    fn next_import_name_uses_original_when_free() {
        let presets = vec![make_preset("a", "Other")];
        assert_eq!(next_import_name(&presets, "Alpha"), "Alpha");
    }

    #[test]
    fn next_import_name_uses_numbered_suffix_when_taken() {
        let presets = vec![make_preset("a", "Alpha")];
        assert_eq!(next_import_name(&presets, "Alpha"), "Alpha (2)");
    }

    #[test]
    fn next_import_name_increments_until_free() {
        let presets = vec![
            make_preset("a", "Alpha"),
            make_preset("b", "Alpha (2)"),
        ];
        assert_eq!(next_import_name(&presets, "Alpha"), "Alpha (3)");
    }

    #[test]
    fn next_import_name_trims_whitespace() {
        let presets: Vec<SavedPreset> = vec![];
        assert_eq!(next_import_name(&presets, "  Alpha  "), "Alpha");
    }
}
