use crate::asset::{AssetRegistry, AssetResolveResult};
use std::path::{Component, Path, PathBuf};
use tauri::image::Image;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

fn is_windows_reserved_stem(stem: &str) -> bool {
    let upper = stem.to_ascii_uppercase();
    matches!(
        upper.as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    )
}

pub(crate) fn validate_single_filename(filename: &str) -> Result<(), String> {
    if filename.trim().is_empty() {
        return Err("Export filename cannot be empty.".to_string());
    }
    if filename.contains('/') || filename.contains('\\') || filename.contains(':') {
        return Err("Export filename cannot contain path separators.".to_string());
    }

    let mut components = Path::new(filename).components();
    match (components.next(), components.next()) {
        (Some(Component::Normal(_)), None) => {}
        _ => return Err("Export filename must be a single filename segment.".to_string()),
    }

    let base_stem = filename.split('.').next().unwrap_or("");
    if is_windows_reserved_stem(base_stem) {
        return Err("Export filename uses a reserved Windows device name.".to_string());
    }

    Ok(())
}

pub(crate) fn resolve_safe_export_path(
    configured_export_folder: Option<&str>,
    folder_path: &str,
    filename: &str,
    prefer_exact_filename: bool,
) -> Result<PathBuf, String> {
    let configured = configured_export_folder
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| "Export folder is not configured in settings.".to_string())?;

    let canonical_configured = std::fs::canonicalize(configured)
        .map_err(|e| format!("Configured export folder is invalid: {e}"))?;
    let canonical_target = std::fs::canonicalize(folder_path)
        .map_err(|e| format!("Target export folder is invalid: {e}"))?;

    if canonical_target != canonical_configured {
        return Err("Export destination must match the configured export folder.".to_string());
    }

    validate_single_filename(filename)?;

    let base_path = canonical_target.join(filename);
    if prefer_exact_filename {
        return Ok(base_path);
    }

    let mut final_path = base_path.clone();
    let mut counter = 1u32;
    while final_path.exists() {
        let stem = base_path.file_stem().unwrap_or_default().to_string_lossy();
        let ext = base_path.extension().unwrap_or_default().to_string_lossy();
        let new_filename = if ext.is_empty() {
            format!("{stem} ({counter})")
        } else {
            format!("{stem} ({counter}).{ext}")
        };
        final_path = base_path.with_file_name(new_filename);
        counter += 1;
    }

    Ok(final_path)
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
    app_handle: AppHandle,
    bytes: Vec<u8>,
    folder_path: String,
    filename: String,
    prefer_exact_filename: Option<bool>,
) -> Result<bool, String> {
    let configured_folder = crate::settings::load_or_create_default(&app_handle).export_folder;
    let exact = prefer_exact_filename.unwrap_or(false);

    tauri::async_runtime::spawn_blocking(move || {
        let final_path =
            resolve_safe_export_path(configured_folder.as_deref(), &folder_path, &filename, exact)?;
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
    use super::*;

    fn create_temp_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("xensnip_asset_{name}_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn resolve_safe_export_path_rejects_unconfigured_or_mismatched_folder() {
        let configured = create_temp_dir("configured");
        let other = create_temp_dir("other");
        let configured_str = configured.to_string_lossy().into_owned();
        let other_str = other.to_string_lossy().into_owned();

        assert!(resolve_safe_export_path(None, &configured_str, "shot.png", false).is_err());
        assert!(
            resolve_safe_export_path(Some(&configured_str), &other_str, "shot.png", false).is_err()
        );

        let _ = std::fs::remove_dir_all(&configured);
        let _ = std::fs::remove_dir_all(&other);
    }

    #[test]
    fn resolve_safe_export_path_rejects_traversal_and_reserved_names() {
        let dir = create_temp_dir("traversal");
        let dir_str = dir.to_string_lossy().into_owned();

        for bad_name in [
            "../evil.png",
            "..\\evil.png",
            "sub/evil.png",
            "sub\\evil.png",
            "C:\\evil.png",
            "..",
            ".",
            "",
            "CON.png",
            "nul",
            "COM1.jpg",
            "LPT9.png",
        ] {
            assert!(
                resolve_safe_export_path(Some(&dir_str), &dir_str, bad_name, false).is_err(),
                "expected rejection for '{bad_name}'"
            );
        }

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_safe_export_path_formats_extensionless_collisions_and_honors_exact_overwrite() {
        let dir = create_temp_dir("collision");
        let dir_str = dir.to_string_lossy().into_owned();
        let canonical = std::fs::canonicalize(&dir).unwrap();

        std::fs::write(canonical.join("capture"), b"old").unwrap();

        let numbered =
            resolve_safe_export_path(Some(&dir_str), &dir_str, "capture", false).unwrap();
        assert_eq!(
            numbered.file_name().unwrap().to_string_lossy(),
            "capture (1)"
        );

        let exact = resolve_safe_export_path(Some(&dir_str), &dir_str, "capture", true).unwrap();
        assert_eq!(exact.file_name().unwrap().to_string_lossy(), "capture");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
