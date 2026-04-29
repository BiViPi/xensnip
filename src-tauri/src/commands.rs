use crate::settings::{load_or_create_default, Settings};
use tauri::{AppHandle, Manager};
use crate::capture::CaptureSession;

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

/// Start region capture: acquire session lock, then show the overlay.
#[tauri::command]
pub fn capture_start_region(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<CaptureSession>();
    session
        .start_persistent(crate::capture::CaptureIntent::Region)
        .map_err(|e| format!("{:?}", e))?;

    match crate::capture::region::capture_region(&app_handle) {
        Ok(()) => Ok(()),
        Err(e) => {
            session.finish();
            Err(format!("{:?}", e))
        }
    }
}

/// Start active-window capture.
#[tauri::command]
pub fn capture_start_window(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<CaptureSession>();
    let _guard = session.start(crate::capture::CaptureIntent::ActiveWindow).map_err(|e| format!("{:?}", e))?;
    
    let res = crate::capture::window::capture_active_window(&app_handle);
    // RAII: _guard drops and finishes session here
    res.map_err(|e| format!("{:?}", e))
}

/// Confirm region selection.
#[tauri::command]
pub fn capture_region_confirm(
    app_handle: AppHandle,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
    monitor_id: String,
) -> Result<(), String> {
    crate::capture::region::finish_region_capture(&app_handle, x, y, w, h, monitor_id)
        .map_err(|e| format!("{:?}", e))
}

/// Cancel capture.
#[tauri::command]
pub fn capture_cancel(app_handle: AppHandle) -> Result<(), String> {
    crate::overlay::close(&app_handle);
    if let Some(session) = app_handle.try_state::<CaptureSession>() {
        session.finish();
    }
    Ok(())
}
