use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub struct BusyRegistry(Arc<Mutex<HashSet<String>>>);

impl BusyRegistry {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(HashSet::new())))
    }
    pub fn set_busy(&self, asset_id: String, busy: bool) {
        if let Ok(mut set) = self.0.lock() {
            if busy {
                set.insert(asset_id);
            } else {
                set.remove(&asset_id);
            }
        }
    }
    pub fn is_any_busy(&self) -> bool {
        if let Ok(set) = self.0.lock() {
            !set.is_empty()
        } else {
            false
        }
    }
}

pub struct ActiveAsset(Arc<Mutex<Option<String>>>);

impl ActiveAsset {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorWorkAreaLogical {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureRectLogical {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturePositionMeta {
    pub monitor_work_area_logical: MonitorWorkAreaLogical,
    pub monitor_dpi: u32,
    pub capture_kind: String,
    pub capture_rect_logical: Option<CaptureRectLogical>,
}

#[derive(Debug, Clone, Serialize)]
pub struct QuickAccessShowPayload {
    pub asset_id: String,
    pub capture_meta: CapturePositionMeta,
}

const EDITOR_WIDTH: u32 = 1100;
const EDITOR_HEIGHT: u32 = 720;
const EDITOR_MIN_WIDTH: u32 = 720;
const EDITOR_MIN_HEIGHT: u32 = 480;
const QA_MARGIN: i32 = 16;
const QA_LABEL: &str = "quick-access";

pub fn emit_show(app: &AppHandle, asset_id: &str, capture_meta: CapturePositionMeta) {
    let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() else {
        log::error!(target: "quick_access", "Asset registry missing during quick-access-show.");
        return;
    };

    if let Some(busy_registry) = app.try_state::<BusyRegistry>() {
        if busy_registry.is_any_busy() {
            log::warn!(target: "quick_access", "New capture ignored: Editor is busy with an action.");
            let _ = registry.release(asset_id, "capture_engine");
            return;
        }
    }

    if let Err(err) = registry.resolve_internal(asset_id, "quick_access_orchestrator") {
        log::error!(
            target: "quick_access",
            "Failed to acquire orchestrator ref for asset_id={}: {}",
            asset_id,
            err
        );
        return;
    }

    let payload = QuickAccessShowPayload {
        asset_id: asset_id.to_string(),
        capture_meta: capture_meta.clone(),
    };

    if let Some(existing) = app.get_webview_window(QA_LABEL) {
        log::info!(target: "quick_access", "Reusing existing QA window for new capture.");
        
        // Update active asset tracking
        if let Some(active_asset) = app.try_state::<ActiveAsset>() {
            let mut current = active_asset.0.lock().unwrap();
            if let Some(old_id) = current.take() {
                let _ = registry.release(&old_id, "quick_access_orchestrator");
            }
            *current = Some(asset_id.to_string());
        }

        // Reposition and focus
        let (x, y) = compute_position(&capture_meta);
        let _ = existing.set_position(tauri::LogicalPosition::new(x as f64, y as f64));
        let _ = existing.set_focus();

        match existing.emit("quick-access-show", &payload) {
            Ok(()) => {
                log::info!(target: "quick_access", "quick-access-show emit ok (reuse) asset_id={}", asset_id);
            }
            Err(err) => {
                log::error!(target: "quick_access", "quick-access-show emit failed (reuse) asset_id={} err={}", asset_id, err);
            }
        }
        let _ = registry.release(asset_id, "capture_engine");
    } else {
        log::info!(target: "quick_access", "Spawning new QA window.");
        if let Some(active_asset) = app.try_state::<ActiveAsset>() {
            *active_asset.0.lock().unwrap() = Some(asset_id.to_string());
        }

        if let Err(err) = spawn_window(app, asset_id, &capture_meta) {
            log::error!(target: "quick_access", "Failed to spawn QA window: {:?}", err);
            let _ = registry.release(asset_id, "quick_access_orchestrator");
            let _ = registry.release(asset_id, "capture_engine");
            return;
        }
        let _ = registry.release(asset_id, "capture_engine");
    }
}

pub fn dismiss(app: &AppHandle, _asset_id: &str) {
    if let Some(window) = app.get_webview_window(QA_LABEL) {
        let _ = window.close();
    }
}

fn spawn_window(
    app: &AppHandle,
    asset_id: &str,
    meta: &CapturePositionMeta,
) -> Result<(), Box<dyn std::error::Error>> {
    let (x, y) = compute_position(meta);

    let url = format!("quick-access.html?asset_id={}", url_encode(asset_id));

    let window = WebviewWindowBuilder::new(
        app,
        QA_LABEL,
        WebviewUrl::App(url.into()),
    )
    .title("XenSnip Editor")
    .decorations(false)
    .resizable(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .transparent(true)
    .focused(true)
    .inner_size(EDITOR_WIDTH as f64, EDITOR_HEIGHT as f64)
    .min_inner_size(EDITOR_MIN_WIDTH as f64, EDITOR_MIN_HEIGHT as f64)
    .position(x as f64, y as f64)
    .build()?;

    let _ = crate::apply_window_native_style(&window);

    let app_handle = app.clone();
    let asset_id = asset_id.to_string();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            if let Some(registry) = app_handle.try_state::<crate::asset::AssetRegistry>() {
                let _ = registry.release(&asset_id, "quick_access_ui");
                let _ = registry.release(&asset_id, "quick_access_orchestrator");
            }
            log::info!(target: "quick_access", "QA window destroyed for asset_id={}", asset_id);
        }
    });

    log::info!(
        target: "quick_access",
        "QA window spawned as Editor at ({},{}) size {}x{}",
        x,
        y,
        EDITOR_WIDTH,
        EDITOR_HEIGHT
    );
    Ok(())
}

fn compute_position(meta: &CapturePositionMeta) -> (i32, i32) {
    let work = &meta.monitor_work_area_logical;
    let default_x = work.x + work.w as i32 - EDITOR_WIDTH as i32 - QA_MARGIN;
    let default_y = work.y + QA_MARGIN;

    if let Some(capture_rect) = &meta.capture_rect_logical {
        let qa_rect = Rect {
            x: default_x,
            y: default_y,
            w: EDITOR_WIDTH as i32,
            h: EDITOR_HEIGHT as i32,
        };
        let capture_rect = Rect {
            x: capture_rect.x,
            y: capture_rect.y,
            w: capture_rect.w as i32,
            h: capture_rect.h as i32,
        };

        if rects_overlap(&qa_rect, &capture_rect) {
            let candidates = [
                (
                    work.x + work.w as i32 - EDITOR_WIDTH as i32 - QA_MARGIN,
                    work.y + work.h as i32 - EDITOR_HEIGHT as i32 - QA_MARGIN,
                ),
                (work.x + QA_MARGIN, work.y + QA_MARGIN),
                (
                    work.x + QA_MARGIN,
                    work.y + work.h as i32 - EDITOR_HEIGHT as i32 - QA_MARGIN,
                ),
            ];

            for (candidate_x, candidate_y) in candidates {
                let candidate = Rect {
                    x: candidate_x,
                    y: candidate_y,
                    w: EDITOR_WIDTH as i32,
                    h: EDITOR_HEIGHT as i32,
                };
                if !rects_overlap(&candidate, &capture_rect) {
                    return (candidate_x, candidate_y);
                }
            }

            log::warn!(target: "quick_access", "All QA positions overlap capture bounds; using default.");
        }
    }

    (default_x, default_y)
}

struct Rect {
    x: i32,
    y: i32,
    w: i32,
    h: i32,
}

fn rects_overlap(a: &Rect, b: &Rect) -> bool {
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
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
