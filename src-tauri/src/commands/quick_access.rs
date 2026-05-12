use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn quick_access_dismiss(app_handle: AppHandle, asset_id: String) -> Result<(), String> {
    crate::quick_access::dismiss(&app_handle, &asset_id);
    Ok(())
}

#[tauri::command]
pub fn quick_access_dismiss_current(app_handle: AppHandle) -> Result<(), String> {
    crate::quick_access::dismiss_current(&app_handle);
    Ok(())
}

#[tauri::command]
pub fn quick_access_set_busy(
    app_handle: AppHandle,
    asset_id: String,
    busy: bool,
) -> Result<(), String> {
    if let Some(registry) = app_handle.try_state::<crate::quick_access::BusyRegistry>() {
        registry.set_busy(asset_id, busy);
    }
    Ok(())
}

#[tauri::command]
pub fn quick_access_mark_ready(app_handle: AppHandle) -> Result<(), String> {
    crate::quick_access::mark_ready(&app_handle);
    Ok(())
}
