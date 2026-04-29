use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, Emitter};
use xcap::Monitor;

// GDI Imports for fallback
use windows::Win32::UI::WindowsAndMessaging::GetDesktopWindow;
use windows::Win32::Graphics::Gdi::{
    CreateCompatibleDC, CreateCompatibleBitmap, SelectObject, BitBlt, DeleteDC, DeleteObject, 
    SRCCOPY, GetDIBits, DIB_RGB_COLORS, BITMAPINFOHEADER, BI_RGB, HGDIOBJ, GetDC, ReleaseDC
};

pub fn capture_region(app: &AppHandle) -> Result<(), CaptureError> {
    crate::overlay::show(app)
}

/// Confirm region selection from the overlay webview.
/// Implements WGC Monitor capture with a GDI BitBlt fallback as per 02-WGC-TIMEOUT-FIX-PROPOSAL.md.
pub fn finish_region_capture(
    app: &AppHandle,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
    monitor_id: String,
) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();
    log::info!(target: "capture", "finish_region_capture: rect={}x{} at {},{}", w, h, x, y);
    
    crate::overlay::close(app);

    // Settle delay
    std::thread::sleep(std::time::Duration::from_millis(200));

    let cleanup = || {
        if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
            session.finish();
        }
    };

    if w < 10 || h < 10 {
        let err = CaptureError::new(crate::capture::errors::CaptureErrorClass::InvalidTarget, "rect_too_small", "Selected region is too small.");
        emit_failure(app, &err, &start_time, crate::diagnostics::CaptureMethod::WgcMonitor);
        cleanup();
        return Err(err);
    }

    let monitors = Monitor::all().unwrap_or_default();
    let target_monitor = if !monitor_id.is_empty() {
        monitors.iter().find(|m| m.name().unwrap_or_default() == monitor_id)
    } else {
        monitors.first()
    };

    let actual_monitor_id = target_monitor.map(|m| m.name().unwrap_or_default()).unwrap_or_else(|| "unknown".into());
    let actual_dpi = target_monitor.map(|m| m.scale_factor().unwrap_or(1.0)).unwrap_or(1.0);
    let dpi_pct = (actual_dpi * 100.0).round() as u32;

    let mut capture_method = crate::diagnostics::CaptureMethod::WgcMonitor;

    // Path 1: Try WGC Monitor Capture
    let image_res = if let Some(m) = target_monitor {
        log::info!(target: "capture", "Attempting WGC capture on monitor: {}", actual_monitor_id);
        m.capture_image()
    } else {
        Err(xcap::XCapError::new("No monitor found for WGC"))
    };

    // Path 2: Fallback to GDI BitBlt if WGC fails or times out
    let final_image = match image_res {
        Ok(img) => {
            log::info!(target: "capture", "Region capture via WGC success.");
            
            let img_w = img.width();
            let img_h = img.height();
            let x_offset = (x.max(0) as u32).min(img_w);
            let y_offset = (y.max(0) as u32).min(img_h);
            let crop_w = w.min(img_w.saturating_sub(x_offset));
            let crop_h = h.min(img_h.saturating_sub(y_offset));

            let raw = img.into_raw();
            if let Some(mut rgba_img) = image::RgbaImage::from_raw(img_w, img_h, raw) {
                image::imageops::crop(&mut rgba_img, x_offset, y_offset, crop_w, crop_h).to_image()
            } else {
                let err = CaptureError::WgcFailure();
                emit_failure(app, &err, &start_time, capture_method);
                cleanup();
                return Err(err);
            }
        },
        Err(e) => {
            log::warn!(target: "capture", "WGC Monitor capture failed ({:?}), falling back to GDI BitBlt...", e);
            capture_method = crate::diagnostics::CaptureMethod::GdiBitblt;
            
            capture_region_gdi(x, y, w, h).map_err(|ge| {
                log::error!(target: "capture", "GDI fallback failed: {}", ge);
                let err = CaptureError::WgcFailure();
                emit_failure(app, &err, &start_time, capture_method.clone());
                cleanup();
                err
            })?
        }
    };

    let final_w = final_image.width();
    let final_h = final_image.height();
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    final_image.write_to(&mut cursor, image::ImageFormat::Png).ok();

    let id = format!("reg_{}", chrono::Utc::now().timestamp_millis());
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset { 
            id: id.clone(), 
            data: bytes, 
            width: final_w, 
            height: final_h 
        });
    }

    cleanup();
    app.emit("capture.result", serde_json::json!({ "asset_id": id })).ok();

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method,
        output_size: crate::diagnostics::PhysicalSize { w_px: final_w, h_px: final_h },
        monitor_id: actual_monitor_id,
        dpi: dpi_pct,
        process_name: None, window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds { x, y, w: final_w, h: final_h },
        asset_id: Some(id.clone()), error_class: None, error_code: None,
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);

    Ok(())
}

fn capture_region_gdi(x: i32, y: i32, w: u32, h: u32) -> Result<image::RgbaImage, String> {
    unsafe {
        let hwnd = GetDesktopWindow();
        let hdc_screen = GetDC(Some(hwnd));
        let hdc_mem = CreateCompatibleDC(Some(hdc_screen));
        let hbm = CreateCompatibleBitmap(hdc_screen, w as i32, h as i32);
        
        let hgdiobj = HGDIOBJ(hbm.0);
        SelectObject(hdc_mem, hgdiobj);

        BitBlt(hdc_mem, 0, 0, w as i32, h as i32, Some(hdc_screen), x, y, SRCCOPY).map_err(|e| e.to_string())?;

        let mut bmi = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: w as i32,
            biHeight: -(h as i32), // Top-down
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        };

        let mut buf = vec![0u8; (w * h * 4) as usize];
        let mut bmi_header = bmi;
        GetDIBits(hdc_screen, hbm, 0, h, Some(buf.as_mut_ptr() as *mut _), (&mut bmi_header) as *mut _ as *mut _, DIB_RGB_COLORS);

        // Convert BGRA (GDI) to RGBA
        for i in (0..buf.len()).step_by(4) {
            let b = buf[i];
            let r = buf[i+2];
            buf[i] = r;
            buf[i+2] = b;
        }

        DeleteObject(hgdiobj);
        DeleteDC(hdc_mem);
        ReleaseDC(Some(hwnd), hdc_screen);

        image::RgbaImage::from_raw(w, h, buf).ok_or_else(|| "Failed to create image from GDI buffer".into())
    }
}

fn emit_failure(app: &AppHandle, err: &CaptureError, start_time: &std::time::Instant, method: crate::diagnostics::CaptureMethod) {
    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method: method,
        output_size: crate::diagnostics::PhysicalSize { w_px: 0, h_px: 0 },
        monitor_id: String::new(), dpi: 0, process_name: None, window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds { x: 0, y: 0, w: 0, h: 0 },
        asset_id: None, error_class: Some(format!("{:?}", err.class)), error_code: Some(err.code.clone()),
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);
    app.emit("capture.failure", err).ok();
}
