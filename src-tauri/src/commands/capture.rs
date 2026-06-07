use crate::capture::CaptureSession;
use tauri::{AppHandle, Emitter, Manager};

const DELAY_WINDOW_WIDTH: f64 = 360.0;
const DELAY_WINDOW_HEIGHT: f64 = 140.0;
const DELAY_WINDOW_MARGIN: f64 = 20.0;
const DELAY_CAPTURE_HIDE_LATENCY_MS: u64 = 140;

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
pub fn capture_start_current_monitor(app_handle: AppHandle) -> Result<(), String> {
    let session = app_handle.state::<CaptureSession>();
    let _guard = session
        .start(crate::capture::CaptureIntent::CurrentMonitor)
        .map_err(|e| format!("{:?}", e))?;
    crate::capture::fullscreen::capture_current_monitor(&app_handle).map_err(|e| format!("{:?}", e))
}

fn show_delay_window(app_handle: &AppHandle, delay_seconds: u32) {
    if let Some(window) = app_handle.get_webview_window("delay_overlay") {
        position_delay_window(app_handle, &window);
        let _ = window.show();
    } else {
        let builder = tauri::WebviewWindowBuilder::new(
            app_handle,
            "delay_overlay",
            tauri::WebviewUrl::App(format!("delay.html?seconds={delay_seconds}").into()),
        )
        .title("Capture Delay")
        .inner_size(DELAY_WINDOW_WIDTH, DELAY_WINDOW_HEIGHT)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .shadow(false)
        .resizable(false);

        let window = if let Some((x, y)) = compute_delay_window_position(app_handle) {
            builder.position(x, y).build()
        } else {
            builder.build()
        };
        let _ = window;
    }
}

fn hide_delay_window(app_handle: &AppHandle) {
    if let Some(window) = app_handle.get_webview_window("delay_overlay") {
        let _ = window.close();
    }
}

fn position_delay_window(app_handle: &AppHandle, window: &tauri::WebviewWindow) {
    if let Some((x, y)) = compute_delay_window_position(app_handle) {
        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
    }
}

fn compute_delay_window_position(app_handle: &AppHandle) -> Option<(f64, f64)> {
    let monitor = app_handle.primary_monitor().ok().flatten()?;
    let position = monitor.position();
    let size = monitor.size();

    let x =
        position.x as f64 + (size.width as f64 - DELAY_WINDOW_WIDTH - DELAY_WINDOW_MARGIN).max(0.0);
    let y = position.y as f64
        + (size.height as f64 - DELAY_WINDOW_HEIGHT - DELAY_WINDOW_MARGIN).max(0.0);
    Some((x, y))
}

#[tauri::command]
pub fn capture_start_window_delayed(
    app_handle: AppHandle,
    delay_seconds: u32,
) -> Result<(), String> {
    if delay_seconds == 0 {
        return capture_start_window(app_handle);
    }

    let session = app_handle.state::<CaptureSession>();
    let cancel_flag = session
        .start_delayed(
            crate::capture::CaptureIntent::ActiveWindow,
            std::time::Duration::from_secs(delay_seconds as u64),
        )
        .map_err(|e| format!("{:?}", e))?;

    let app_handle_clone = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        // Must be on main thread to spawn window in Tauri
        let app_handle_main = app_handle_clone.clone();
        let window_app_handle = app_handle_main.clone();
        let _ = app_handle_main.run_on_main_thread(move || {
            show_delay_window(&window_app_handle, delay_seconds);
        });

        let total_ms = delay_seconds.saturating_mul(1000);
        let _ = app_handle_clone.emit(
            "capture://delay-started",
            serde_json::json!({
                "remaining_ms": total_ms,
                "total_ms": total_ms
            }),
        );

        let mut remaining_ms = total_ms;
        let interval_ms = 100;

        while remaining_ms > 0 {
            if cancel_flag.load(std::sync::atomic::Ordering::SeqCst) {
                hide_delay_window(&app_handle_clone);
                let _ = app_handle_clone.emit("capture://delay-cancelled", ());
                return;
            }

            let _ = app_handle_clone.emit(
                "capture://delay-tick",
                serde_json::json!({
                    "remaining_ms": remaining_ms,
                    "total_ms": total_ms
                }),
            );

            tokio::time::sleep(tokio::time::Duration::from_millis(interval_ms as u64)).await;
            remaining_ms = remaining_ms.saturating_sub(interval_ms);
        }

        let session = app_handle_clone.state::<CaptureSession>();
        let Some(token) = session.consume_pending_delayed() else {
            hide_delay_window(&app_handle_clone);
            let _ = app_handle_clone.emit("capture://delay-cancelled", ());
            return;
        };

        let _ = app_handle_clone.emit("capture://delay-fired", ());

        // Resolve foreground window inside the post-delay path (after sleep)
        let delay_meta = crate::diagnostics::CaptureDelayMetadata {
            requested_ms: token.delay.as_millis().min(u128::from(u32::MAX)) as u32,
            actual_ms: token
                .scheduled_at
                .elapsed()
                .as_millis()
                .min(u128::from(u32::MAX)) as u32,
        };
        let final_app_handle = app_handle_clone.clone();
        hide_delay_window(&final_app_handle);
        tokio::time::sleep(tokio::time::Duration::from_millis(
            DELAY_CAPTURE_HIDE_LATENCY_MS,
        ))
        .await;
        let _ = app_handle_clone.run_on_main_thread(move || {
            if token.intent != crate::capture::CaptureIntent::ActiveWindow {
                log::warn!(target: "capture", "Unexpected delayed capture intent: {:?}", token.intent);
                return;
            }
            let session = final_app_handle.state::<CaptureSession>();
            match session.start(crate::capture::CaptureIntent::ActiveWindow) {
                Ok(_guard) => {
                    let _ = crate::capture::window::capture_active_window_with_delay(
                        &final_app_handle,
                        Some(delay_meta),
                    );
                }
                Err(err) => {
                    log::warn!(target: "capture", "Delayed active-window capture rejected: {:?}", err);
                    final_app_handle.emit("capture.failure", &err).ok();
                }
            };
        });
    });

    Ok(())
}

#[tauri::command]
pub fn capture_start_region_delayed(
    app_handle: AppHandle,
    delay_seconds: u32,
) -> Result<(), String> {
    if delay_seconds == 0 {
        return capture_start_region(app_handle);
    }
    // Descoping delayed region capture for now as per plan instructions if frozen snapshot is too complex.
    // Fallback: just run it immediately if requested, or return error. Returning error is better.
    Err("Delayed region capture is not yet supported in this version.".to_string())
}

#[tauri::command]
pub fn capture_cancel(app_handle: AppHandle) -> Result<(), String> {
    crate::capture::native_region_active::close_active();
    if let Some(session) = app_handle.try_state::<CaptureSession>() {
        session.cancel_pending_delayed();
        session.finish();
    }
    hide_delay_window(&app_handle);
    let _ = app_handle.emit("capture://delay-cancelled", ());
    Ok(())
}
