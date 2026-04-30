use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

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

const QA_WIDTH: u32 = 520;
const QA_HEIGHT: u32 = 420;
const QA_MARGIN: i32 = 16;
const QA_LABEL: &str = "quick-access";

pub fn emit_show(app: &AppHandle, asset_id: &str, capture_meta: CapturePositionMeta) {
    log::info!(target: "quick_access", "emit_show start asset_id={}", asset_id);
    eprintln!("[qa-debug] emit_show start asset_id={}", asset_id);
    let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() else {
        log::error!(target: "quick_access", "Asset registry missing during quick-access-show.");
        eprintln!("[qa-debug] asset registry missing");
        return;
    };

    log::info!(target: "quick_access", "emit_show before resolve_internal asset_id={}", asset_id);
    eprintln!("[qa-debug] before resolve_internal asset_id={}", asset_id);
    if let Err(err) = registry.resolve_internal(asset_id, "quick_access_orchestrator") {
        log::error!(
            target: "quick_access",
            "Failed to acquire orchestrator ref for asset_id={}: {}",
            asset_id,
            err
        );
        eprintln!("[qa-debug] resolve_internal failed asset_id={} err={}", asset_id, err);
        return;
    }
    log::info!(target: "quick_access", "emit_show after resolve_internal asset_id={}", asset_id);
    eprintln!("[qa-debug] after resolve_internal asset_id={}", asset_id);

    log::info!(target: "quick_access", "emit_show before existing window check asset_id={}", asset_id);
    eprintln!("[qa-debug] before existing window check asset_id={}", asset_id);
    if let Some(existing) = app.get_webview_window(QA_LABEL) {
        log::info!(target: "quick_access", "Replacing existing QA window for new capture.");
        eprintln!("[qa-debug] existing QA window found, closing");
        let _ = existing.close();
    }
    log::info!(target: "quick_access", "emit_show after existing window check asset_id={}", asset_id);
    eprintln!("[qa-debug] after existing window check asset_id={}", asset_id);

    let payload = QuickAccessShowPayload {
        asset_id: asset_id.to_string(),
        capture_meta: capture_meta.clone(),
    };
    log::info!(target: "quick_access", "emit_show payload built asset_id={}", asset_id);
    eprintln!("[qa-debug] payload built asset_id={}", asset_id);

    log::info!(target: "quick_access", "emit_show before spawn_window asset_id={}", asset_id);
    eprintln!("[qa-debug] before spawn_window asset_id={}", asset_id);
    if let Err(err) = spawn_window(app, asset_id, &capture_meta) {
        log::error!(target: "quick_access", "Failed to spawn QA window: {:?}", err);
        eprintln!("[qa-debug] spawn_window failed asset_id={} err={:?}", asset_id, err);
        let _ = registry.release(asset_id, "quick_access_orchestrator");
        let _ = registry.release(asset_id, "capture_engine");
        return;
    }
    log::info!(target: "quick_access", "emit_show after spawn_window asset_id={}", asset_id);
    eprintln!("[qa-debug] after spawn_window asset_id={}", asset_id);

    let _ = registry.release(asset_id, "capture_engine");
    log::info!(target: "quick_access", "emit_show after release capture_engine asset_id={}", asset_id);
    eprintln!("[qa-debug] after release capture_engine asset_id={}", asset_id);

    log::info!(target: "quick_access", "emit_show before emit asset_id={}", asset_id);
    eprintln!("[qa-debug] before emit asset_id={}", asset_id);
    if let Some(window) = app.get_webview_window(QA_LABEL) {
        match window.emit("quick-access-show", &payload) {
            Ok(()) => {
                log::info!(target: "quick_access", "quick-access-show emit ok asset_id={}", asset_id);
                eprintln!("[qa-debug] emit ok asset_id={}", asset_id);
            }
            Err(err) => {
                log::error!(
                    target: "quick_access",
                    "quick-access-show emit failed asset_id={} err={}",
                    asset_id,
                    err
                );
                eprintln!("[qa-debug] emit failed asset_id={} err={}", asset_id, err);
            }
        }
    } else {
        log::error!(target: "quick_access", "QA window missing before quick-access-show emit asset_id={}", asset_id);
        eprintln!("[qa-debug] QA window missing before emit asset_id={}", asset_id);
    }
    log::info!(target: "quick_access", "quick-access-show emitted for asset_id={}", asset_id);
    eprintln!("[qa-debug] emit_show done asset_id={}", asset_id);
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
    log::info!(target: "quick_access", "spawn_window start asset_id={}", asset_id);
    eprintln!("[qa-debug] spawn_window start asset_id={}", asset_id);
    let (x, y) = compute_position(meta);
    log::info!(target: "quick_access", "spawn_window position asset_id={} x={} y={}", asset_id, x, y);
    eprintln!("[qa-debug] spawn_window position asset_id={} x={} y={}", asset_id, x, y);

    let url = format!("quick-access.html?asset_id={}", url_encode(asset_id));
    log::info!(target: "quick_access", "spawn_window url asset_id={} url={}", asset_id, url);
    eprintln!("[qa-debug] spawn_window url asset_id={} url={}", asset_id, url);

    let window = WebviewWindowBuilder::new(
        app,
        QA_LABEL,
        WebviewUrl::App(url.into()),
    )
    .title("XenSnip Quick Access")
    .decorations(true)
    .resizable(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(false)
    .inner_size(QA_WIDTH as f64, QA_HEIGHT as f64)
    .position(x as f64, y as f64)
    .build()?;
    log::info!(target: "quick_access", "spawn_window build ok asset_id={}", asset_id);
    eprintln!("[qa-debug] spawn_window build ok asset_id={}", asset_id);

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
        "QA window spawned at ({},{}) size {}x{}",
        x,
        y,
        QA_WIDTH,
        QA_HEIGHT
    );
    Ok(())
}

fn compute_position(meta: &CapturePositionMeta) -> (i32, i32) {
    let work = &meta.monitor_work_area_logical;
    let default_x = work.x + work.w as i32 - QA_WIDTH as i32 - QA_MARGIN;
    let default_y = work.y + QA_MARGIN;

    if let Some(capture_rect) = &meta.capture_rect_logical {
        let qa_rect = Rect {
            x: default_x,
            y: default_y,
            w: QA_WIDTH as i32,
            h: QA_HEIGHT as i32,
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
                    work.x + work.w as i32 - QA_WIDTH as i32 - QA_MARGIN,
                    work.y + work.h as i32 - QA_HEIGHT as i32 - QA_MARGIN,
                ),
                (work.x + QA_MARGIN, work.y + QA_MARGIN),
                (
                    work.x + QA_MARGIN,
                    work.y + work.h as i32 - QA_HEIGHT as i32 - QA_MARGIN,
                ),
            ];

            for (candidate_x, candidate_y) in candidates {
                let candidate = Rect {
                    x: candidate_x,
                    y: candidate_y,
                    w: QA_WIDTH as i32,
                    h: QA_HEIGHT as i32,
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
