use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

const EDITOR_LABEL_PREFIX: &str = "editor-";

#[derive(Debug, Serialize)]
pub struct EditorOpenResult {
    pub window_label: String,
    pub asset_uri: String,
}

pub fn open(app: &AppHandle, asset_id: &str) -> Result<EditorOpenResult, String> {
    let asset_uri = format!("xensnip-asset://{}", asset_id);
    let window_label = format!(
        "{}{}",
        EDITOR_LABEL_PREFIX,
        chrono::Utc::now().timestamp_millis()
    );

    let registry = app
        .try_state::<crate::asset::AssetRegistry>()
        .ok_or_else(|| "Asset registry not available".to_string())?;

    registry
        .resolve_internal(asset_id, &window_label)
        .map_err(|e| e.to_string())?;

    match spawn_editor_window(app, &window_label, asset_id, &asset_uri) {
        Ok(()) => {
            let count = count_open_editors(app);
            app.emit(
                "editor.count_changed",
                serde_json::json!({ "open_count": count }),
            )
            .ok();
            log::info!(
                target: "editor",
                "Editor opened: label={} asset_id={} open_count={}",
                window_label,
                asset_id,
                count
            );
            Ok(EditorOpenResult {
                window_label,
                asset_uri,
            })
        }
        Err(err) => {
            let _ = registry.release(asset_id, &window_label);
            log::error!(target: "editor", "Failed to spawn editor window: {}", err);
            Err(format!("Failed to open editor: {}", err))
        }
    }
}

fn spawn_editor_window(
    app: &AppHandle,
    window_label: &str,
    asset_id: &str,
    asset_uri: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let window = WebviewWindowBuilder::new(
        app,
        window_label,
        WebviewUrl::App(format!("/editor.html?asset_uri={}", url_encode(asset_uri)).into()),
    )
    .title("XenSnip Editor")
    .decorations(true)
    .resizable(true)
    .inner_size(900.0, 620.0)
    .build()?;

    let app_handle = app.clone();
    let asset_id = asset_id.to_string();
    let consumer = window_label.to_string();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            if let Some(registry) = app_handle.try_state::<crate::asset::AssetRegistry>() {
                let _ = registry.release(&asset_id, &consumer);
            }
            let count = count_open_editors(&app_handle);
            app_handle
                .emit(
                    "editor.count_changed",
                    serde_json::json!({ "open_count": count }),
                )
                .ok();
            log::info!(target: "editor", "Editor closed: label={} open_count={}", consumer, count);
        }
    });

    Ok(())
}

fn count_open_editors(app: &AppHandle) -> u32 {
    app.webview_windows()
        .keys()
        .filter(|label| label.starts_with(EDITOR_LABEL_PREFIX))
        .count() as u32
}

fn url_encode(value: &str) -> String {
    value
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c.to_string()
            } else {
                format!("%{:02X}", c as u32)
            }
        })
        .collect()
}
