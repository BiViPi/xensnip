use crate::asset::{AssetRegistry, AssetResolveResult};
use tauri::image::Image;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

fn build_sequential_export_path(folder_path: &str, filename: &str) -> std::path::PathBuf {
    let folder = std::path::PathBuf::from(folder_path);
    let requested = std::path::Path::new(filename);
    let stem = requested
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let ext = requested
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    let mut index = 1;
    loop {
        let numbered = if ext.is_empty() {
            format!("{}_{:02}", stem, index)
        } else {
            format!("{}_{:02}.{}", stem, index, ext)
        };
        let candidate = folder.join(numbered);
        if !candidate.exists() {
            return candidate;
        }
        index += 1;
    }
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
        let final_path = build_sequential_export_path(&folder_path, &filename);
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

#[cfg(test)]
mod tests {
    use super::build_sequential_export_path;
    use std::fs;

    fn make_temp_dir(test_name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "xensnip_export_naming_{}_{}",
            test_name,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn starts_at_capture_01() {
        let dir = make_temp_dir("starts_at_capture_01");
        let path = build_sequential_export_path(dir.to_str().unwrap(), "capture.png");
        assert_eq!(path.file_name().unwrap().to_string_lossy(), "capture_01.png");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn increments_to_next_available_number() {
        let dir = make_temp_dir("increments_to_next_available_number");
        fs::write(dir.join("capture_01.png"), b"a").unwrap();
        fs::write(dir.join("capture_02.png"), b"b").unwrap();

        let path = build_sequential_export_path(dir.to_str().unwrap(), "capture.png");
        assert_eq!(path.file_name().unwrap().to_string_lossy(), "capture_03.png");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fills_the_first_gap_in_sequence() {
        let dir = make_temp_dir("fills_the_first_gap_in_sequence");
        fs::write(dir.join("capture_01.png"), b"a").unwrap();
        fs::write(dir.join("capture_03.png"), b"b").unwrap();

        let path = build_sequential_export_path(dir.to_str().unwrap(), "capture.png");
        assert_eq!(path.file_name().unwrap().to_string_lossy(), "capture_02.png");
        let _ = fs::remove_dir_all(dir);
    }
}
