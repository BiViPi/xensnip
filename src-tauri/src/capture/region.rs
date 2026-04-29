use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, Emitter};
use xcap::Monitor;

pub fn capture_region(app: &AppHandle) -> Result<(), CaptureError> {
    crate::overlay::show(app)
}

/// Confirm region selection from the overlay webview.
/// The session lock is held by the caller (capture_start_region path or hotkey path).
/// This function closes the overlay, performs the capture, emits capture.result, and releases the lock.
pub fn finish_region_capture(
    app: &AppHandle,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
    monitor_id: String,
) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();
    crate::overlay::close(app);

    // Reject tiny / invalid rects upfront
    if w < 10 || h < 10 {
        if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
            session.finish();
        }
        return Err(CaptureError::new(
            crate::capture::errors::CaptureErrorClass::InvalidTarget,
            "rect_too_small",
            "Selected region is too small to capture.",
        ));
    }

    let monitors = Monitor::all().map_err(|_| CaptureError::WgcFailure())?;

    // Try to find the specified monitor; fall back to first with a documented warning.
    let target_monitor = if !monitor_id.is_empty() {
        monitors
            .into_iter()
            .find(|m| m.name().unwrap_or_default() == monitor_id)
            .ok_or_else(|| {
                log::warn!(
                    target: "capture",
                    "monitor_id '{}' not found — falling back to first monitor",
                    monitor_id
                );
                CaptureError::InvalidTarget()
            })?
    } else {
        // monitor_id is empty: overlay did not supply it (known limitation, logged here).
        log::warn!(
            target: "capture",
            "monitor_id empty — falling back to first monitor (single-monitor path)"
        );
        monitors
            .into_iter()
            .next()
            .ok_or(CaptureError::InvalidTarget())?
    };

    let actual_monitor_id = target_monitor.name().unwrap_or_default();
    let actual_dpi = target_monitor.scale_factor().unwrap_or(1.0);
    let dpi_pct = (actual_dpi * 100.0).round() as u32;

    let image = target_monitor
        .capture_image()
        .map_err(|_| CaptureError::WgcFailure())?;

    // Crop to selected rect — coords are physical pixels from the overlay.
    let img_w = image.width();
    let img_h = image.height();
    let x_offset = (x.max(0) as u32).min(img_w);
    let y_offset = (y.max(0) as u32).min(img_h);
    let crop_w = w.min(img_w.saturating_sub(x_offset));
    let crop_h = h.min(img_h.saturating_sub(y_offset));

    if crop_w == 0 || crop_h == 0 {
        if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
            session.finish();
        }
        return Err(CaptureError::new(
            crate::capture::errors::CaptureErrorClass::InvalidTarget,
            "rect_out_of_bounds",
            "Selected region is outside monitor bounds.",
        ));
    }

    let raw = image.into_raw();
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    if let Some(mut img) = image::RgbaImage::from_raw(img_w, img_h, raw) {
        let cropped =
            image::imageops::crop(&mut img, x_offset, y_offset, crop_w, crop_h).to_image();
        cropped
            .write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|_| CaptureError::WgcFailure())?;
    } else {
        if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
            session.finish();
        }
        return Err(CaptureError::WgcFailure());
    }

    let id = format!("reg_{}", chrono::Utc::now().timestamp_millis());
    let asset = crate::asset::Asset {
        id: id.clone(),
        data: bytes,
        width: crop_w,
        height: crop_h,
    };

    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(asset);
    }

    // Release session lock before emitting so the frontend can start a new capture immediately.
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }

    app.emit(
        "capture.result",
        serde_json::json!({ "asset_id": id }),
    )
    .ok();

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method: crate::diagnostics::CaptureMethod::WgcMonitor,
        output_size: crate::diagnostics::PhysicalSize {
            w_px: crop_w,
            h_px: crop_h,
        },
        monitor_id: actual_monitor_id,
        dpi: dpi_pct,
        process_name: None,
        window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds {
            x,
            y,
            w: crop_w,
            h: crop_h,
        },
        asset_id: Some(id.clone()),
        error_class: None,
        error_code: None,
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);

    Ok(())
}
