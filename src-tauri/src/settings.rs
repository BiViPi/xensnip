use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Hotkeys {
    pub region: String,
    pub active_window: String,
}

fn default_true() -> bool { true }
fn default_format() -> String { "PNG".to_string() }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub version: u32,
    pub hotkeys: Hotkeys,
    pub launch_at_startup: bool,
    #[serde(default = "default_true")]
    pub play_copy_sound: bool,
    #[serde(default = "default_true")]
    pub play_save_sound: bool,
    #[serde(default)]
    pub export_folder: Option<String>,
    #[serde(default = "default_format")]
    pub export_format: String,
    #[serde(default = "default_true")]
    pub capture_all_monitors: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: 3,
            hotkeys: Hotkeys {
                region: "Ctrl+Shift+S".to_string(),
                active_window: "Ctrl+Alt+W".to_string(),
            },
            launch_at_startup: false,
            play_copy_sound: true,
            play_save_sound: true,
            export_folder: None,
            export_format: "PNG".to_string(),
            capture_all_monitors: true,
        }
    }
}

fn migrate_settings_if_needed(settings: &mut Settings) -> bool {
    let mut changed = false;

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

    changed
}

pub fn get_settings_path(app_handle: &AppHandle) -> PathBuf {
    let mut path = app_handle
        .path()
        .app_config_dir()
        .expect("Failed to get app config dir");
    if !path.exists() {
        fs::create_dir_all(&path).expect("Failed to create app config dir");
    }
    path.push("settings.json");
    path
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
}

#[derive(Debug, serde::Serialize)]
pub struct SettingsSaveResult {
    pub warnings: Vec<HotkeyWarning>,
}

pub fn load_or_create_default(app_handle: &AppHandle) -> Settings {
    let path = get_settings_path(app_handle);

    if path.exists() {
        let content = fs::read_to_string(&path).expect("Failed to read settings file");
        match serde_json::from_str::<Settings>(&content) {
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
        }
    } else {
        let defaults = Settings::default();
        let _ = save_settings(app_handle, &defaults).map_err(|e| {
            log::error!(target: "settings", "failed to save initial default settings: {}", e);
        });
        defaults
    }
}

pub fn save_settings(app_handle: &AppHandle, settings: &Settings) -> Result<(), std::io::Error> {
    let path = get_settings_path(app_handle);
    let content = serde_json::to_string_pretty(settings).expect("Failed to serialize settings");
    fs::write(path, content)?;
    Ok(())
}
