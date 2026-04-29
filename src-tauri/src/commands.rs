use crate::settings::{load_or_create_default, Settings};
use tauri::{AppHandle, Manager};

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
/// If overlay creation fails, the lock is released before returning the error.
#[tauri::command]
pub fn capture_start_region(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<crate::capture::CaptureSession>();
    if let Err(e) = session.start(crate::capture::CaptureIntent::Region) {
        return Err(format!("{:?}", e));
    }
    match crate::capture::region::capture_region(&app_handle) {
        Ok(()) => Ok(()),
        Err(e) => {
            // overlay creation failed — release lock so next intent can proceed
            session.finish();
            Err(format!("{:?}", e))
        }
    }
}

/// Start active-window capture: acquire session lock, run capture, release lock.
#[tauri::command]
pub fn capture_start_window(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<crate::capture::CaptureSession>();
    if let Err(e) = session.start(crate::capture::CaptureIntent::ActiveWindow) {
        return Err(format!("{:?}", e));
    }
    let res = crate::capture::window::capture_active_window(&app_handle);
    // Always release the session lock — success or failure.
    session.finish();
    res.map_err(|e| format!("{:?}", e))
}

/// Confirm region selection from the overlay.
/// The session lock was held since capture_start_region; finish() is called inside finish_region_capture.
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

/// Cancel any in-progress capture: close overlay (if open) and release the session lock.
#[tauri::command]
pub fn capture_cancel(app_handle: AppHandle) -> Result<(), String> {
    crate::overlay::close(&app_handle);
    if let Some(session) = app_handle.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }
    Ok(())
}
