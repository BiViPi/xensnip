use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri::Manager;
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

#[derive(Default)]
pub struct SettingsLock(Mutex<()>);

impl SettingsLock {
    pub fn new() -> Self {
        Self(Mutex::new(()))
    }

    pub fn lock(&self) -> MutexGuard<'_, ()> {
        self.0.lock().unwrap_or_else(|e| e.into_inner())
    }
}

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
    #[serde(default)]
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
        changed = true;
    }

    if settings.version < 4 {
        settings.version = 4;
        changed = true;
    }

    if settings.version < 5 {
        settings.version = 5;
        changed = true;
    }

    if settings.version < 6 {
        settings.version = 6;
        changed = true;
    }

    if settings.version < 7 {
        settings.version = 7;
        changed = true;
    }

    if settings.version < 8 {
        settings.version = 8;
        changed = true;
    }

    if settings.version < 9 {
        settings.version = 9;
        changed = true;
    }

    if settings.version < 10 {
        settings.version = 10;
        changed = true;
    }

    if settings.version < 11 {
        settings.version = 11;
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

pub fn save_settings_at_path(path: &Path, settings: &Settings) -> Result<(), io::Error> {
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
    let tmp_path = path.with_file_name("settings.json.tmp");
    {
        let mut tmp_file = fs::File::create(&tmp_path)?;
        tmp_file.write_all(content.as_bytes())?;
        tmp_file.sync_all()?;
    }
    fs::rename(&tmp_path, path)?;
    Ok(())
}

pub fn load_or_create_default_at_path(path: &Path) -> Settings {
    if path.exists() {
        match fs::read_to_string(path) {
            Ok(content) => match serde_json::from_str::<Settings>(&content) {
                Ok(mut settings) => {
                    if migrate_settings_if_needed(&mut settings) {
                        let _ = save_settings_at_path(path, &settings).map_err(|e| {
                            log::error!(target: "settings", "failed to save migrated settings: {}", e);
                        });
                    }
                    settings
                }
                Err(parse_err) => {
                    log::error!(
                        target: "settings",
                        "failed to parse settings file '{}': {}",
                        path.display(),
                        parse_err
                    );
                    let unix_secs = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    let bak_path =
                        path.with_file_name(format!("settings.corrupt-{unix_secs}.json.bak"));
                    if let Err(rename_err) = fs::rename(path, &bak_path) {
                        log::warn!(
                            target: "settings",
                            "failed to rename corrupt settings file to '{}': {}",
                            bak_path.display(),
                            rename_err
                        );
                        if let Err(copy_err) = fs::copy(path, &bak_path) {
                            log::warn!(
                                target: "settings",
                                "failed to copy corrupt settings file to '{}': {}",
                                bak_path.display(),
                                copy_err
                            );
                        }
                    }

                    let defaults = Settings::default();
                    let _ = save_settings_at_path(path, &defaults).map_err(|e| {
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
        let _ = save_settings_at_path(path, &defaults).map_err(|e| {
            log::error!(target: "settings", "failed to save initial default settings: {}", e);
        });
        defaults
    }
}

pub fn load_or_create_default_unlocked(app_handle: &AppHandle) -> Settings {
    let path = match get_settings_path(app_handle) {
        Ok(p) => p,
        Err(e) => {
            log::error!(target: "settings", "failed to resolve settings path: {}", e);
            return Settings::default();
        }
    };
    load_or_create_default_at_path(&path)
}

pub fn save_settings_unlocked(
    app_handle: &AppHandle,
    settings: &Settings,
) -> Result<(), io::Error> {
    let path = get_settings_path(app_handle)?;
    save_settings_at_path(&path, settings)
}

pub fn load_or_create_default(app_handle: &AppHandle) -> Settings {
    let lock_state = app_handle.try_state::<SettingsLock>();
    let _guard = lock_state.as_ref().map(|s| s.lock());
    load_or_create_default_unlocked(app_handle)
}

#[allow(dead_code)]
pub fn save_settings(app_handle: &AppHandle, settings: &Settings) -> Result<(), io::Error> {
    let lock_state = app_handle.try_state::<SettingsLock>();
    let _guard = lock_state.as_ref().map(|s| s.lock());
    save_settings_unlocked(app_handle, settings)
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

    #[test]
    fn normalize_capture_delay_seconds_accepts_allowed_values_and_clamps_others() {
        assert_eq!(normalize_capture_delay_seconds(0), 0);
        assert_eq!(normalize_capture_delay_seconds(3), 3);
        assert_eq!(normalize_capture_delay_seconds(5), 5);
        assert_eq!(normalize_capture_delay_seconds(10), 10);
        assert_eq!(normalize_capture_delay_seconds(1), 0);
        assert_eq!(normalize_capture_delay_seconds(7), 0);
        assert_eq!(normalize_capture_delay_seconds(30), 0);
    }

    #[test]
    fn settings_save_result_serializes_warnings_and_settings() {
        let settings = Settings::default();
        let result = SettingsSaveResult {
            warnings: vec![
                HotkeyWarning {
                    field: "print_screen".to_string(),
                    shortcut: "PrintScreen".to_string(),
                    code: Some("windows_snipping_conflict".to_string()),
                },
                HotkeyWarning {
                    field: "region".to_string(),
                    shortcut: "Ctrl+Shift+S".to_string(),
                    code: None,
                },
            ],
            settings,
        };

        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["settings"]["version"], 11);
        assert_eq!(json["warnings"][0]["field"], "print_screen");
        assert_eq!(json["warnings"][0]["code"], "windows_snipping_conflict");
        assert_eq!(json["warnings"][1]["field"], "region");
        assert!(json["warnings"][1]["code"].is_null());
    }

    #[test]
    fn load_or_create_default_backs_up_corrupt_settings_and_writes_atomically() {
        let dir = std::env::temp_dir().join(format!("xensnip_settings_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let settings_path = dir.join("settings.json");

        fs::write(&settings_path, b"{corrupt json").unwrap();

        let loaded = load_or_create_default_at_path(&settings_path);
        assert_eq!(loaded.version, 11);
        assert!(settings_path.exists());
        assert!(!dir.join("settings.json.tmp").exists());

        let backups: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name().to_string_lossy().into_owned();
                name.starts_with("settings.corrupt-") && name.ends_with(".json.bak")
            })
            .collect();
        assert_eq!(backups.len(), 1);
        assert_eq!(fs::read(backups[0].path()).unwrap(), b"{corrupt json");

        let mut updated = loaded.clone();
        updated.theme = "light".to_string();
        save_settings_at_path(&settings_path, &updated).unwrap();
        assert!(!dir.join("settings.json.tmp").exists());
        assert_eq!(
            load_or_create_default_at_path(&settings_path).theme,
            "light"
        );

        let _ = fs::remove_dir_all(&dir);
    }
}
