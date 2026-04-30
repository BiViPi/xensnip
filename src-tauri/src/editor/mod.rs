pub mod errors;
pub mod registry;

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use self::errors::EditorOpenError;
use self::registry::EditorRegistry;

const EDITOR_LABEL_PREFIX: &str = "editor-";

fn focus_most_recent_editor(app: &AppHandle, registry: &EditorRegistry) -> bool {
    if let Some(focused_label) = registry.get_most_recent_label() {
        if let Some(window) = app.get_webview_window(&focused_label) {
            let _ = window.unminimize();
            let _ = window.set_focus();
            // Fallback for Windows focus quirks.
            let _ = window.set_always_on_top(true);
            let _ = window.set_always_on_top(false);
            return true;
        }
    }

    false
}

pub fn open_empty(app: &AppHandle) -> Result<String, EditorOpenError> {
    let registry = app.state::<EditorRegistry>();
    
    // Multi-window guard (limit 3)
    if registry.count() >= 3 {
        let focused_label = registry
            .get_most_recent_label()
            .unwrap_or_else(|| "most-recent-editor".to_string());

        let _ = focus_most_recent_editor(app, &registry);
        return Err(EditorOpenError::SoftLimitReached { focused_label });
    }

    let window_label = format!(
        "{}{}",
        EDITOR_LABEL_PREFIX,
        chrono::Utc::now().timestamp_millis()
    );

    match spawn_editor_window(app, &window_label, None) {
        Ok(()) => {
            registry.add(window_label.clone());
            let count = registry.count();
            app.emit(
                "editor.count_changed",
                serde_json::json!({ "open_count": count }),
            )
            .ok();
            
            log::info!(
                target: "editor",
                "Editor opened (empty): label={} open_count={}",
                window_label,
                count
            );
            
            Ok(window_label)
        }
        Err(err) => {
            log::error!(target: "editor", "Failed to spawn empty editor window: {}", err);
            Err(EditorOpenError::SpawnFailed { message: err.to_string() })
        }
    }
}

fn spawn_editor_window(
    app: &AppHandle,
    window_label: &str,
    asset_id: Option<&str>,
) -> Result<(), Box<dyn std::error::Error>> {
    let url = if let Some(id) = asset_id {
        WebviewUrl::App(format!("editor.html?asset_id={}", url_encode(id)).into())
    } else {
        WebviewUrl::App("editor.html".into())
    };

    // Cascaded positioning logic (simple)
    let open_count = app.state::<EditorRegistry>().count() as i32;
    let offset = open_count * 24;

    let window = WebviewWindowBuilder::new(app, window_label, url)
        .title("XenSnip Editor")
        .decorations(true)
        .resizable(true)
        .inner_size(1100.0, 720.0)
        .min_inner_size(720.0, 480.0)
        .position(100.0 + offset as f64, 100.0 + offset as f64) // Basic cascading
        .build()?;

    let app_handle = app.clone();
    let asset_id_owned = asset_id.map(|s| s.to_string());
    let consumer = window_label.to_string();
    
    window.on_window_event(move |event| {
        match event {
            WindowEvent::Destroyed => {
                if let Some(asset_id) = &asset_id_owned {
                    if let Some(registry) = app_handle.try_state::<crate::asset::AssetRegistry>() {
                        let _ = registry.release(asset_id, &consumer);
                    }
                }
                
                if let Some(registry) = app_handle.try_state::<EditorRegistry>() {
                    registry.remove(&consumer);
                    let count = registry.count();
                    app_handle
                        .emit(
                            "editor.count_changed",
                            serde_json::json!({ "open_count": count }),
                        )
                        .ok();
                    log::info!(target: "editor", "Editor closed: label={} open_count={}", consumer, count);
                }
            }
            WindowEvent::Focused(true) => {
                if let Some(registry) = app_handle.try_state::<EditorRegistry>() {
                    registry.update_focus(&consumer);
                }
            }
            _ => {}
        }
    });

    Ok(())
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
