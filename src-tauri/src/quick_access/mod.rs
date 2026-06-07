use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
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

    pub fn clear(&self) {
        if let Ok(mut set) = self.0.lock() {
            set.clear();
        }
    }
}

pub struct ActiveAsset(Arc<Mutex<Option<String>>>);

impl ActiveAsset {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
}

pub struct ReadyRegistry(Arc<Mutex<bool>>);

impl ReadyRegistry {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(false)))
    }

    pub fn set_ready(&self, ready: bool) {
        if let Ok(mut state) = self.0.lock() {
            *state = ready;
        }
    }

    pub fn is_ready(&self) -> bool {
        if let Ok(state) = self.0.lock() {
            *state
        } else {
            false
        }
    }
}

pub struct PendingShow(Arc<Mutex<Option<QuickAccessShowPayload>>>);

impl PendingShow {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }

    pub fn set(&self, payload: QuickAccessShowPayload) {
        if let Ok(mut pending) = self.0.lock() {
            *pending = Some(payload);
        }
    }

    pub fn take(&self) -> Option<QuickAccessShowPayload> {
        if let Ok(mut pending) = self.0.lock() {
            pending.take()
        } else {
            None
        }
    }

    pub fn clear(&self) {
        if let Ok(mut pending) = self.0.lock() {
            *pending = None;
        }
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
const QA_UI_CONSUMER: &str = "quick_access_ui";
const QA_ORCHESTRATOR_CONSUMER: &str = "quick_access_orchestrator";
const QA_BUSY_MESSAGE: &str = "Finish the current action before adding another capture.";

pub fn pre_warm(app: &AppHandle) {
    if app.get_webview_window(QA_LABEL).is_some() {
        return;
    }

    match spawn_empty_window(app, false, false) {
        Ok(_) => log::info!(target: "perf", "[PREWARM] Hidden QA window created"),
        Err(err) => {
            log::warn!(target: "perf", "[PREWARM] Failed to create hidden QA window: {:?}", err)
        }
    }
}

pub fn emit_show(app: &AppHandle, asset_id: &str, capture_meta: CapturePositionMeta) {
    let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() else {
        log::error!(target: "quick_access", "Asset registry missing during quick-access-show.");
        return;
    };

    if let Some(busy_registry) = app.try_state::<BusyRegistry>() {
        if busy_registry.is_any_busy() {
            log::warn!(target: "quick_access", "New capture ignored: Editor is busy with an action.");
            let _ = app.emit(
                "capture.failure",
                crate::capture::errors::CaptureError::new(
                    crate::capture::errors::CaptureErrorClass::Busy,
                    "editor_busy",
                    QA_BUSY_MESSAGE,
                ),
            );
            let _ = registry.release(asset_id, "capture_engine");
            return;
        }
    }

    if let Err(err) = registry.resolve_internal(asset_id, QA_ORCHESTRATOR_CONSUMER) {
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
        log::info!(target: "perf", "[WARM] Reusing existing QA window");

        // Update active asset tracking
        if let Some(active_asset) = app.try_state::<ActiveAsset>() {
            let mut current = active_asset.0.lock().unwrap();
            if let Some(old_id) = current.take() {
                let _ = registry.release(&old_id, QA_ORCHESTRATOR_CONSUMER);
            }
            *current = Some(asset_id.to_string());
        }

        let ready = app
            .try_state::<ReadyRegistry>()
            .map(|state| state.is_ready())
            .unwrap_or(false);

        if ready {
            show_existing_window(&existing);
            match existing.emit("quick-access-show", &payload) {
                Ok(()) => {
                    log::info!(target: "quick_access", "quick-access-show emit ok (reuse) asset_id={}", asset_id);
                }
                Err(err) => {
                    log::error!(target: "quick_access", "quick-access-show emit failed (reuse) asset_id={} err={}", asset_id, err);
                }
            }
        } else {
            log::info!(target: "perf", "[PREWARM] QA window exists but is not ready; queueing payload");
            if let Some(pending) = app.try_state::<PendingShow>() {
                pending.set(payload.clone());
            }
        }

        let _ = registry.release(asset_id, "capture_engine");
    } else {
        log::info!(target: "perf", "[COLD] Spawning new QA window");
        if let Some(active_asset) = app.try_state::<ActiveAsset>() {
            *active_asset.0.lock().unwrap() = Some(asset_id.to_string());
        }

        if let Err(err) = spawn_window(app, asset_id, &capture_meta) {
            log::error!(target: "quick_access", "Failed to spawn QA window: {:?}", err);
            let _ = registry.release(asset_id, QA_ORCHESTRATOR_CONSUMER);
            let _ = registry.release(asset_id, "capture_engine");
            return;
        }
        let _ = registry.release(asset_id, "capture_engine");
    }
}

pub fn dismiss(app: &AppHandle, asset_id: &str) {
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        let _ = registry.release(asset_id, QA_UI_CONSUMER);
        let _ = registry.release(asset_id, QA_ORCHESTRATOR_CONSUMER);
    }

    if let Some(active_asset) = app.try_state::<ActiveAsset>() {
        let mut current = active_asset.0.lock().unwrap();
        if current.as_deref() == Some(asset_id) {
            *current = None;
        }
    }

    if let Some(window) = app.get_webview_window(QA_LABEL) {
        let _ = window.hide();
    }
}

pub fn dismiss_current(app: &AppHandle) {
    cleanup_hidden_window_session(app);

    if let Some(window) = app.get_webview_window(QA_LABEL) {
        let _ = window.hide();
    }
}

pub fn focus_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(QA_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    if let Err(err) = spawn_empty_window(app, true, true) {
        log::error!(target: "quick_access", "Failed to spawn empty editor window: {:?}", err);
    }
}

pub fn mark_ready(app: &AppHandle) {
    if let Some(ready) = app.try_state::<ReadyRegistry>() {
        ready.set_ready(true);
    }

    if let Some(window) = app.get_webview_window(QA_LABEL) {
        if let Some(payload) = app
            .try_state::<PendingShow>()
            .and_then(|pending| pending.take())
        {
            log::info!(target: "perf", "[PREWARM] QA window became ready; flushing pending payload");
            show_existing_window(&window);
            if let Err(err) = window.emit("quick-access-show", &payload) {
                log::error!(target: "quick_access", "quick-access-show emit failed after ready flush asset_id={} err={}", payload.asset_id, err);
            }
        }
    }
}

fn spawn_window(
    app: &AppHandle,
    asset_id: &str,
    meta: &CapturePositionMeta,
) -> Result<(), Box<dyn std::error::Error>> {
    let (x, y) = compute_position(meta);
    let url = build_quick_access_url(asset_id, meta);

    let window = WebviewWindowBuilder::new(app, QA_LABEL, WebviewUrl::App(url.into()))
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
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            cleanup_window_state(&app_handle);
            log::info!(target: "quick_access", "QA window destroyed.");
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

fn spawn_empty_window(
    app: &AppHandle,
    focused: bool,
    visible: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let window =
        WebviewWindowBuilder::new(app, QA_LABEL, WebviewUrl::App("quick-access.html".into()))
            .title("XenSnip Editor")
            .decorations(false)
            .resizable(true)
            .always_on_top(false)
            .skip_taskbar(false)
            .transparent(true)
            .focused(focused)
            .visible(visible)
            .inner_size(EDITOR_WIDTH as f64, EDITOR_HEIGHT as f64)
            .min_inner_size(EDITOR_MIN_WIDTH as f64, EDITOR_MIN_HEIGHT as f64)
            .build()?;

    let _ = crate::apply_window_native_style(&window);

    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            cleanup_window_state(&app_handle);
            log::info!(target: "quick_access", "Empty editor window destroyed.");
        }
    });

    log::info!(target: "quick_access", "Empty editor window spawned from tray.");
    Ok(())
}

fn show_existing_window(window: &tauri::WebviewWindow) {
    let _ = window.show();
    let _ = window.unminimize();
}

fn cleanup_hidden_window_session(app: &AppHandle) {
    if let Some(pending) = app.try_state::<PendingShow>() {
        pending.clear();
    }
    if let Some(busy_registry) = app.try_state::<BusyRegistry>() {
        busy_registry.clear();
    }
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.release_consumer_all(QA_UI_CONSUMER);
    }
    if let Some(active_asset) = app.try_state::<ActiveAsset>() {
        if let Some(asset_id) = active_asset.0.lock().unwrap().take() {
            if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
                let _ = registry.release(&asset_id, QA_ORCHESTRATOR_CONSUMER);
            }
        }
    }
}

fn cleanup_window_state(app: &AppHandle) {
    if let Some(ready) = app.try_state::<ReadyRegistry>() {
        ready.set_ready(false);
    }
    cleanup_hidden_window_session(app);
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

fn build_quick_access_url(asset_id: &str, meta: &CapturePositionMeta) -> String {
    format!(
        "quick-access.html?asset_id={}&capture_kind={}",
        url_encode(asset_id),
        url_encode(&meta.capture_kind)
    )
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

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_meta(capture_kind: &str) -> CapturePositionMeta {
        CapturePositionMeta {
            monitor_work_area_logical: MonitorWorkAreaLogical {
                x: 0,
                y: 0,
                w: 1920,
                h: 1080,
            },
            monitor_dpi: 100,
            capture_kind: capture_kind.to_string(),
            capture_rect_logical: None,
        }
    }

    #[test]
    fn build_quick_access_url_includes_capture_kind_for_cold_spawn() {
        let url = build_quick_access_url("asset-123", &sample_meta("fullscreen"));
        assert_eq!(
            url,
            "quick-access.html?asset_id=asset-123&capture_kind=fullscreen"
        );
    }

    #[test]
    fn build_quick_access_url_encodes_special_characters() {
        let url = build_quick_access_url("asset id", &sample_meta("full screen"));
        assert_eq!(
            url,
            "quick-access.html?asset_id=asset%20id&capture_kind=full%20screen"
        );
    }
}
