use crate::asset::{AssetRegistry, AssetResolveResult};
use tauri::image::Image;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

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
        .map(|bytes| (*bytes).clone())
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
pub async fn export_save_media(
    _app_handle: AppHandle,
    bytes: Vec<u8>,
    folder_path: String,
    filename: String,
) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut path = std::path::PathBuf::from(folder_path);
        path.push(filename);

        let mut final_path = path.clone();
        let mut counter = 1;
        while final_path.exists() {
            let stem = path.file_stem().unwrap_or_default().to_string_lossy();
            let ext = path.extension().unwrap_or_default().to_string_lossy();
            let new_filename = format!("{} ({}).{}", stem, counter, ext);
            final_path = path.with_file_name(new_filename);
            counter += 1;
        }

        std::fs::write(final_path, bytes).map_err(|e| e.to_string())?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn select_export_folder(app_handle: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let maybe_path = app_handle.dialog().file().blocking_pick_folder();

        match maybe_path {
            Some(path) => Ok(Some(
                path.into_path()
                    .map_err(|_| "Invalid path".to_string())?
                    .to_string_lossy()
                    .into_owned(),
            )),
            None => Ok(None),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
