use crate::settings::{load_or_create_default, Settings};
use tauri::AppHandle;

#[derive(serde::Serialize)]
pub struct PingResponse {
    pub version: String,
    pub name: String,
}

#[tauri::command]
pub fn app_ping() -> PingResponse {
    PingResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
    }
}

#[tauri::command]
pub fn settings_load(app_handle: AppHandle) -> Settings {
    load_or_create_default(&app_handle)
}

#[tauri::command]
pub fn capture_active_window(app_handle: AppHandle) -> Result<(), String> {
    crate::capture::window::capture_active_window(&app_handle).map_err(|e| format!("{:?}", e))
}

#[tauri::command]
pub fn finish_region_capture(app_handle: AppHandle, x: i32, y: i32, w: u32, h: u32) -> Result<(), String> {
    crate::capture::region::finish_region_capture(&app_handle, x, y, w, h).map_err(|e| format!("{:?}", e))
}
