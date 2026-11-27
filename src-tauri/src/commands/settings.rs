use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn settings_save(
    app_handle: AppHandle,
    mut new_settings: crate::settings::Settings,
) -> Result<crate::settings::SettingsSaveResult, crate::settings::SettingsSaveError> {
    new_settings.capture_delay_seconds =
        crate::settings::normalize_capture_delay_seconds(new_settings.capture_delay_seconds);

    log::info!(
        target: "settings",
        "settings_save requested: region={:?}, active_window={:?}, launch_at_startup={}, capture_delay_seconds={}, print_screen_capture_enabled={}",
        new_settings.hotkeys.region,
        new_settings.hotkeys.active_window,
        new_settings.launch_at_startup,
        new_settings.capture_delay_seconds,
        new_settings.print_screen_capture_enabled,
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

    // 2. Serialize read-modify-write against concurrent preset/settings mutations
    let (hotkeys_changed, autostart_changed, print_screen_changed) = {
        let lock = app_handle.state::<crate::settings::SettingsLock>();
        let _guard = lock.lock();

        let old_settings = crate::settings::load_or_create_default_unlocked(&app_handle);
        let hotkeys_changed = old_settings.hotkeys.region != new_settings.hotkeys.region
            || old_settings.hotkeys.active_window != new_settings.hotkeys.active_window;
        let autostart_changed = old_settings.launch_at_startup != new_settings.launch_at_startup;
        let print_screen_changed =
            old_settings.print_screen_capture_enabled != new_settings.print_screen_capture_enabled;

        // 3. Write to file
        crate::settings::save_settings_unlocked(&app_handle, &new_settings).map_err(|e| {
            log::error!(target: "settings", "settings_save write failure: {}", e);
            crate::settings::SettingsSaveError::WriteError {
                message: e.to_string(),
            }
        })?;

        (hotkeys_changed, autostart_changed, print_screen_changed)
    };

    // 4. Re-register hotkeys
    warnings.extend(crate::hotkeys::re_register(&app_handle, &new_settings));

    // 5. Sync autostart
    crate::autostart::sync(&app_handle, new_settings.launch_at_startup);

    // 6. Log success
    log::info!(
        target: "settings",
        "settings.saved {{ version: {}, hotkeys_changed: {}, autostart_changed: {}, print_screen_changed: {} }}",
        new_settings.version,
        hotkeys_changed,
        autostart_changed,
        print_screen_changed,
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
    let lock = app_handle.state::<crate::settings::SettingsLock>();
    let _guard = lock.lock();
    let mut settings = crate::settings::load_or_create_default_unlocked(&app_handle);
    settings.last_preset = Some(preset);
    crate::settings::save_settings_unlocked(&app_handle, &settings).map_err(|e| e.to_string())?;
    Ok(())
}
