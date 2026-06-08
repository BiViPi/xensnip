use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Hotkeys {
    pub region: String,
    pub active_window: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedPreset {
    pub id: String,
    pub name: String,
    pub preset: serde_json::Value,
    #[serde(default = "chrono_now_iso")]
    pub updated_at: String,
}

fn chrono_now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn default_true() -> bool {
    true
}
fn default_format() -> String {
    "PNG".to_string()
}
fn default_theme() -> String {
    "dark".to_string()
}
fn default_presentation_mode() -> String {
    "flat".to_string()
}

fn default_capture_delay_seconds() -> u32 {
    0
}

fn default_print_screen_capture_enabled() -> bool {
    false
}

pub fn normalize_capture_delay_seconds(value: u32) -> u32 {
    match value {
        0 | 3 | 5 | 10 => value,
        _ => 0,
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub version: u32,
    pub hotkeys: Hotkeys,
    pub launch_at_startup: bool,
    #[serde(default = "default_true")]
    pub play_copy_sound: bool,
    #[serde(default = "default_capture_delay_seconds")]
    pub capture_delay_seconds: u32,
    #[serde(default = "default_true")]
    pub play_save_sound: bool,
    #[serde(default)]
    pub export_folder: Option<String>,
    #[serde(default = "default_format")]
    pub export_format: String,
    #[serde(default = "default_true")]
    pub capture_all_monitors: bool,
    #[serde(default = "default_print_screen_capture_enabled")]
    pub print_screen_capture_enabled: bool,
    #[serde(default)]
    pub saved_presets: Vec<SavedPreset>,
    #[serde(default)]
    pub last_preset: Option<serde_json::Value>,
    #[serde(default)]
    pub default_preset_id: Option<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_presentation_mode")]
    pub default_presentation_mode: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: 11,
            hotkeys: Hotkeys {
                region: "Ctrl+Shift+S".to_string(),
                active_window: "Ctrl+Alt+W".to_string(),
            },
            launch_at_startup: false,
            play_copy_sound: true,
            capture_delay_seconds: 0,
            play_save_sound: true,
            export_folder: None,
            export_format: "PNG".to_string(),
            capture_all_monitors: true,
            print_screen_capture_enabled: false,
            saved_presets: Vec::new(),
            last_preset: None,
            default_preset_id: None,
            theme: "dark".to_string(),
            default_presentation_mode: "flat".to_string(),
        }
    }
}

fn migrate_settings_if_needed(settings: &mut Settings) -> bool {
    let mut changed = false;

    let normalized_delay = normalize_capture_delay_seconds(settings.capture_delay_seconds);
    if settings.capture_delay_seconds != normalized_delay {
        settings.capture_delay_seconds = normalized_delay;
        changed = true;
    }

    if settings.version < 2 {
        if settings.hotkeys.active_window == "Ctrl+Shift+W" {
            settings.hotkeys.active_window = "Ctrl+Alt+W".to_string();
        }
        settings.version = 2;
        changed = true;
    }

    if settings.version < 3 {
        settings.version = 3;
        // Serde default handlers will have already populated the struct with default values during parsing
        changed = true;
    }

    if settings.version < 4 {
        settings.version = 4;
        // v4: no data migration needed; serde defaults cover new fields
        changed = true;
    }

    if settings.version < 5 {
        settings.version = 5;
        // v5: no data migration needed; serde defaults cover new fields
        changed = true;
    }

    if settings.version < 6 {
        settings.version = 6;
        // v6: no data migration needed; serde defaults cover new fields
        changed = true;
    }

    if settings.version < 7 {
        settings.version = 7;
        // v7: no data migration needed; serde defaults cover new fields
        changed = true;
    }

    if settings.version < 8 {
        settings.version = 8;
        // v8: frame_style and view_angle added to EditorPreset on the TS side;
        // serde_json::Value storage means no Rust schema change is required
        changed = true;
    }

    if settings.version < 9 {
        settings.version = 9;
        // v9: default_presentation_mode added; serde default covers new field
        changed = true;
    }

    if settings.version < 10 {
        settings.version = 10;
        // v10: capture_delay_seconds added; serde default covers new field
        changed = true;
    }

    if settings.version < 11 {
        settings.version = 11;
        // v11: print_screen_capture_enabled added; serde default covers new field
        changed = true;
    }

    changed
}

pub fn is_windows_print_screen_snipping_enabled() -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let keyboard = match hkcu.open_subkey("Control Panel\\Keyboard") {
        Ok(key) => key,
        Err(err) => {
            log::warn!(
                target: "settings",
                "failed to open keyboard settings registry key: {}",
                err
            );
            return false;
        }
    };

    match keyboard.get_value::<u32, _>("PrintScreenKeyForSnippingEnabled") {
        Ok(value) => value == 1,
        Err(err) => {
            log::warn!(
                target: "settings",
                "failed to read PrintScreenKeyForSnippingEnabled: {}",
                err
            );
            false
        }
    }
}

pub fn get_settings_path(app_handle: &AppHandle) -> Result<PathBuf, io::Error> {
    let mut path = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| io::Error::new(io::ErrorKind::NotFound, e.to_string()))?;
    if !path.exists() {
        fs::create_dir_all(&path)?;
    }
    path.push("settings.json");
    Ok(path)
}

#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(tag = "code", content = "data")]
pub enum SettingsSaveError {
    #[error("invalid hotkey '{value}' for field '{field}'")]
    InvalidHotkey { field: String, value: String },
    #[error("failed to write settings: {message}")]
    WriteError { message: String },
}

#[derive(Debug, serde::Serialize)]
pub struct HotkeyWarning {
    pub field: String,
    pub shortcut: String,
    pub code: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct SettingsSaveResult {
    pub warnings: Vec<HotkeyWarning>,
    pub settings: Settings,
}

pub fn load_or_create_default(app_handle: &AppHandle) -> Settings {
    let path = match get_settings_path(app_handle) {
        Ok(p) => p,
        Err(e) => {
            log::error!(target: "settings", "failed to resolve settings path: {}", e);
            return Settings::default();
        }
    };

    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => match serde_json::from_str::<Settings>(&content) {
                Ok(mut settings) => {
                    if migrate_settings_if_needed(&mut settings) {
                        let _ = save_settings(app_handle, &settings).map_err(|e| {
                            log::error!(target: "settings", "failed to save migrated settings: {}", e);
                        });
                    }
                    settings
                }
                Err(_) => {
                    let defaults = Settings::default();
                    let _ = save_settings(app_handle, &defaults).map_err(|e| {
                        log::error!(target: "settings", "failed to save default settings after parse error: {}", e);
                    });
                    defaults
                }
            },
            Err(e) => {
                log::error!(target: "settings", "failed to read settings file: {}", e);
                Settings::default()
            }
        }
    } else {
        let defaults = Settings::default();
        let _ = save_settings(app_handle, &defaults).map_err(|e| {
            log::error!(target: "settings", "failed to save initial default settings: {}", e);
        });
        defaults
    }
}

pub fn save_settings(app_handle: &AppHandle, settings: &Settings) -> Result<(), io::Error> {
    let path = get_settings_path(app_handle)?;
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
    fs::write(path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings_at_version(version: u32) -> Settings {
        Settings {
            version,
            ..Default::default()
        }
    }

    #[test]
    fn already_current_version_reports_no_change() {
        let mut s = settings_at_version(11);
        let changed = migrate_settings_if_needed(&mut s);
        assert!(!changed);
        assert_eq!(s.version, 11);
    }

    #[test]
    fn migrates_v1_hotkey_conflict_and_bumps_version() {
        let mut s = settings_at_version(1);
        s.hotkeys.active_window = "Ctrl+Shift+W".to_string();
        let changed = migrate_settings_if_needed(&mut s);
        assert!(changed);
        assert_eq!(s.hotkeys.active_window, "Ctrl+Alt+W");
        assert_eq!(s.version, 11);
    }

    #[test]
    fn migrates_v1_without_hotkey_conflict_still_bumps_version() {
        let mut s = settings_at_version(1);
        s.hotkeys.active_window = "Ctrl+Alt+W".to_string();
        let changed = migrate_settings_if_needed(&mut s);
        assert!(changed);
        assert_eq!(s.hotkeys.active_window, "Ctrl+Alt+W");
        assert_eq!(s.version, 11);
    }

    #[test]
    fn migrates_v6_to_v7() {
        let mut s = settings_at_version(6);
        let changed = migrate_settings_if_needed(&mut s);
        assert!(changed);
        assert_eq!(s.version, 11);
    }

    #[test]
    fn migrates_v7_to_v8() {
        let mut s = settings_at_version(7);
        let changed = migrate_settings_if_needed(&mut s);
        assert!(changed);
        assert_eq!(s.version, 11);
    }

    #[test]
    fn migrates_v8_to_v9() {
        let mut s = settings_at_version(8);
        let changed = migrate_settings_if_needed(&mut s);
        assert!(changed);
        assert_eq!(s.version, 11);
        assert_eq!(s.default_presentation_mode, "flat");
    }

    #[test]
    fn migrates_v9_to_v10() {
        let mut s = settings_at_version(9);
        let changed = migrate_settings_if_needed(&mut s);
        assert!(changed);
        assert_eq!(s.version, 11);
        assert_eq!(s.capture_delay_seconds, 0);
    }

    #[test]
    fn migrates_v10_to_v11() {
        let mut s = settings_at_version(10);
        let changed = migrate_settings_if_needed(&mut s);
        assert!(changed);
        assert_eq!(s.version, 11);
        assert!(!s.print_screen_capture_enabled);
    }

    #[test]
    fn invalid_capture_delay_clamps_to_zero() {
        let mut s = settings_at_version(11);
        s.capture_delay_seconds = 7;
        let changed = migrate_settings_if_needed(&mut s);

        assert!(changed);
        assert_eq!(s.capture_delay_seconds, 0);
    }

    #[test]
    fn valid_capture_delay_is_preserved() {
        let mut s = settings_at_version(11);
        s.capture_delay_seconds = 5;
        let changed = migrate_settings_if_needed(&mut s);

        assert!(!changed);
        assert_eq!(s.capture_delay_seconds, 5);
    }

    #[test]
    fn default_settings_are_at_current_version() {
        let s = Settings::default();
        assert_eq!(s.version, 11);
        assert_eq!(s.default_presentation_mode, "flat");
        assert_eq!(s.capture_delay_seconds, 0);
        assert!(!s.print_screen_capture_enabled);
    }
}
