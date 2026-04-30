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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub version: u32,
    pub hotkeys: Hotkeys,
    pub launch_at_startup: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: 2,
            hotkeys: Hotkeys {
                region: "Ctrl+Shift+S".to_string(),
                active_window: "Ctrl+Alt+W".to_string(),
            },
            launch_at_startup: false,
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

pub fn load_or_create_default(app_handle: &AppHandle) -> Settings {
    let path = get_settings_path(app_handle);

    if path.exists() {
        let content = fs::read_to_string(&path).expect("Failed to read settings file");
        match serde_json::from_str::<Settings>(&content) {
            Ok(mut settings) => {
                if migrate_settings_if_needed(&mut settings) {
                    save_settings(app_handle, &settings);
                }
                settings
            }
            Err(_) => {
                let defaults = Settings::default();
                save_settings(app_handle, &defaults);
                defaults
            }
        }
    } else {
        let defaults = Settings::default();
        save_settings(app_handle, &defaults);
        defaults
    }
}

pub fn save_settings(app_handle: &AppHandle, settings: &Settings) {
    let path = get_settings_path(app_handle);
    let content = serde_json::to_string_pretty(settings).expect("Failed to serialize settings");
    fs::write(path, content).expect("Failed to write settings file");
}
