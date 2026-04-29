use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, Emitter};
use xcap::Monitor;

pub fn capture_region(app: &AppHandle) -> Result<(), CaptureError> {
    crate::overlay::show(app)
}

pub fn finish_region_capture(app: &AppHandle, x: i32, y: i32, w: u32, h: u32) -> Result<(), CaptureError> {
    crate::overlay::close(app);

    let monitors = Monitor::all().map_err(|_| CaptureError::WgcFailure())?;
    // For MVP, just capture primary monitor.
    // Real implementation would capture the correct monitor based on coordinates.
    let target_monitor = monitors.first().ok_or(CaptureError::InvalidTarget())?;
    
    let image = target_monitor.capture_image().map_err(|_| CaptureError::WgcFailure())?;
    
    // Crop
    let x_offset = (x.max(0) as u32).min(image.width());
    let y_offset = (y.max(0) as u32).min(image.height());
    let crop_w = w.min(image.width() - x_offset);
    let crop_h = h.min(image.height() - y_offset);

    // Encode to PNG using image 0.24
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    let raw = image.into_raw();
    if let Some(mut img) = image::RgbaImage::from_raw(target_monitor.width().unwrap_or(0), target_monitor.height().unwrap_or(0), raw) {
        let cropped = image::imageops::crop(&mut img, x_offset, y_offset, crop_w, crop_h).to_image();
        cropped.write_to(&mut cursor, image::ImageFormat::Png).map_err(|_| CaptureError::WgcFailure())?;
    } else {
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
    
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }
    
    app.emit("capture-complete", serde_json::json!({ "asset_id": id })).ok();
    
    // Log diagnostic
    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method: crate::diagnostics::CaptureMethod::WgcMonitor,
        output_size: crate::diagnostics::PhysicalSize { w_px: crop_w, h_px: crop_h },
        monitor_id: String::new(),
        dpi: 96,
        process_name: None,
        window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds { x, y, w: crop_w, h: crop_h },
        asset_id: Some(id.clone()),
        error_class: None,
        error_code: None,
        duration_ms: 0,
    };
    crate::diagnostics::log_capture_event(app, &meta);
    
    Ok(())
}
