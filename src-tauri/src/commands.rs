use crate::asset::{AssetRegistry, AssetResolveResult};
use crate::capture::CaptureSession;
use crate::settings::{load_or_create_default, Settings};
use tauri::image::Image;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

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
pub fn capture_start_region(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<CaptureSession>();
    session
        .start_persistent(crate::capture::CaptureIntent::Region)
        .map_err(|e| format!("{:?}", e))?;

    match crate::capture::region::capture_region(&app_handle) {
        Ok(()) => Ok(()),
        Err(err) => {
            session.finish();
            Err(format!("{:?}", err))
        }
    }
}

#[tauri::command]
pub fn capture_start_window(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<CaptureSession>();
    let _guard = session
        .start(crate::capture::CaptureIntent::ActiveWindow)
        .map_err(|e| format!("{:?}", e))?;
    crate::capture::window::capture_active_window(&app_handle).map_err(|e| format!("{:?}", e))
}

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

#[tauri::command]
pub fn capture_cancel(app_handle: AppHandle) -> Result<(), String> {
    crate::overlay::close(&app_handle);
    if let Some(session) = app_handle.try_state::<CaptureSession>() {
        session.finish();
    }
    Ok(())
}

#[tauri::command]
pub fn asset_resolve(
    app_handle: AppHandle,
    asset_id: String,
    consumer: String,
) -> Result<AssetResolveResult, String> {
    let registry = app_handle.state::<AssetRegistry>();
    registry
        .resolve(&asset_id, &consumer)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn asset_release(
    app_handle: AppHandle,
    asset_id: String,
    consumer: String,
) -> Result<(), String> {
    let registry = app_handle.state::<AssetRegistry>();
    registry
        .release(&asset_id, &consumer)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn asset_read_png(app_handle: AppHandle, asset_id: String) -> Result<Vec<u8>, String> {
    let registry = app_handle.state::<AssetRegistry>();
    registry
        .get_data(&asset_id)
        .ok_or_else(|| "Asset not found or already dropped.".to_string())
}

#[tauri::command]
pub fn clipboard_write_image(app_handle: AppHandle, png_bytes: Vec<u8>) -> Result<(), String> {
    let decoded = image::load_from_memory(&png_bytes).map_err(|e| e.to_string())?;
    let rgba = decoded.to_rgba8();
    let image = Image::new_owned(rgba.into_raw(), decoded.width(), decoded.height());
    app_handle
        .clipboard()
        .write_image(&image)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_save_png(
    app_handle: AppHandle,
    png_bytes: Vec<u8>,
    default_filename: String,
) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let maybe_path = app_handle
            .dialog()
            .file()
            .add_filter("PNG Image", &["png"])
            .set_file_name(default_filename)
            .blocking_save_file();

        let Some(path) = maybe_path else {
            return Ok(false);
        };

        let path = path
            .into_path()
            .map_err(|_| "Selected path is not supported".to_string())?;
        std::fs::write(path, png_bytes).map_err(|e| e.to_string())?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn editor_open(
    app_handle: AppHandle,
    window: tauri::WebviewWindow,
    asset_id: String,
) -> Result<crate::editor::EditorOpenResult, crate::editor::errors::EditorOpenError> {
    crate::editor::open(&app_handle, &asset_id, window.label())
}

#[tauri::command]
pub fn editor_open_empty(
    app_handle: AppHandle,
) -> Result<String, crate::editor::errors::EditorOpenError> {
    crate::editor::open_empty(&app_handle)
}

#[tauri::command]
pub fn quick_access_dismiss(app_handle: AppHandle, asset_id: String) -> Result<(), String> {
    crate::quick_access::dismiss(&app_handle, &asset_id);
    Ok(())
}

#[tauri::command]
pub fn debug_webview_probe(
    label: String,
    stage: String,
    href: String,
    root_children: i32,
    scripts: i32,
) -> Result<(), String> {
    log::info!(
        target: "webview_probe",
        "label={} stage={} href={} root_children={} scripts={}",
        label,
        stage,
        href,
        root_children,
        scripts
    );
    Ok(())
}
