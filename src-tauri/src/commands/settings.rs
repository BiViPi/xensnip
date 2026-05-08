use tauri::AppHandle;

#[tauri::command]
pub fn settings_save(
    app_handle: AppHandle,
    new_settings: crate::settings::Settings,
) -> Result<crate::settings::SettingsSaveResult, crate::settings::SettingsSaveError> {
    log::info!(
        target: "settings",
        "settings_save requested: region={:?}, active_window={:?}, launch_at_startup={}",
        new_settings.hotkeys.region,
        new_settings.hotkeys.active_window,
        new_settings.launch_at_startup,
    );

    // 1. Validate hotkeys
    let _: tauri_plugin_global_shortcut::Shortcut =
        new_settings.hotkeys.region.parse().map_err(|_| {
            crate::settings::SettingsSaveError::InvalidHotkey {
                field: "region".to_string(),
                value: new_settings.hotkeys.region.clone(),
            }
        })?;

    let _: tauri_plugin_global_shortcut::Shortcut =
        new_settings.hotkeys.active_window.parse().map_err(|_| {
            crate::settings::SettingsSaveError::InvalidHotkey {
                field: "active_window".to_string(),
                value: new_settings.hotkeys.active_window.clone(),
            }
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
pub fn settings_update_last_preset(
    app_handle: AppHandle,
    preset: serde_json::Value,
) -> Result<(), String> {
    let mut settings = crate::settings::load_or_create_default(&app_handle);
    settings.last_preset = Some(preset);
    crate::settings::save_settings(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}
