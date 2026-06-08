use tauri::AppHandle;

#[tauri::command]
pub fn settings_save(
    app_handle: AppHandle,
    mut new_settings: crate::settings::Settings,
) -> Result<crate::settings::SettingsSaveResult, crate::settings::SettingsSaveError> {
    new_settings.capture_delay_seconds =
        crate::settings::normalize_capture_delay_seconds(new_settings.capture_delay_seconds);

    log::info!(
        target: "settings",
        "settings_save requested: region={:?}, active_window={:?}, launch_at_startup={}, capture_delay_seconds={}",
        new_settings.hotkeys.region,
        new_settings.hotkeys.active_window,
        new_settings.launch_at_startup,
        new_settings.capture_delay_seconds,
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

    let mut warnings = Vec::new();

    if new_settings.print_screen_capture_enabled
        && crate::settings::is_windows_print_screen_snipping_enabled()
    {
        new_settings.print_screen_capture_enabled = false;
        warnings.push(crate::settings::HotkeyWarning {
            field: "print_screen".to_string(),
            shortcut: "PrintScreen".to_string(),
            code: Some("windows_snipping_conflict".to_string()),
        });
    }

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
    warnings.extend(crate::hotkeys::re_register(&app_handle, &new_settings));

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

    Ok(crate::settings::SettingsSaveResult {
        warnings,
        settings: new_settings,
    })
}

#[tauri::command]
pub fn open_print_screen_keyboard_settings() -> Result<(), String> {
    std::process::Command::new("explorer.exe")
        .arg("ms-settings:easeofaccess-keyboard")
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
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
