use tauri::AppHandle;
use winreg::enums::*;
use winreg::RegKey;

/**
 * Syncs the application's autostart state with the Windows Registry.
 * Uses winreg as a fallback because tauri-plugin-autostart v2 trait resolution
 * was inconsistent in this environment.
 */
pub fn sync(_app: &AppHandle, enabled: bool) {
    if cfg!(debug_assertions) {
        log::info!(
            target: "settings",
            "autostart.sync_skipped {{ enabled: {}, reason: \"debug_build\" }}",
            enabled
        );
        return;
    }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";

    let Ok(key) = hkcu.open_subkey_with_flags(path, KEY_SET_VALUE | KEY_QUERY_VALUE) else {
        log::warn!(target: "settings", "autostart.sync_failed: failed to open registry key");
        return;
    };

    let Ok(app_exe) = std::env::current_exe() else {
        log::warn!(target: "settings", "autostart.sync_failed: failed to get current exe path");
        return;
    };
    let app_exe_str = app_exe.to_string_lossy().to_string();

    if enabled {
        if let Err(e) = key.set_value("XenSnip", &app_exe_str) {
            log::warn!(target: "settings", "autostart.sync_failed {{ enabled: true, error: \"{:?}\" }}", e);
        } else {
            log::info!(target: "settings", "autostart.enabled in registry");
        }
    } else {
        // Only delete if it exists to avoid unnecessary errors
        if key.get_value::<String, _>("XenSnip").is_ok() {
            if let Err(e) = key.delete_value("XenSnip") {
                log::warn!(target: "settings", "autostart.sync_failed {{ enabled: false, error: \"{:?}\" }}", e);
            } else {
                log::info!(target: "settings", "autostart.disabled in registry");
            }
        }
    }
}
