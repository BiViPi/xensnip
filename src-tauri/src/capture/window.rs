use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Manager, Emitter};
use xcap::Window;
use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

pub fn capture_active_window(app: &AppHandle) -> Result<(), CaptureError> {
    let foreground_hwnd = unsafe { GetForegroundWindow() };
    if foreground_hwnd.0.is_null() {
        return Err(CaptureError::WindowUnavailable());
    }
    
    let windows = Window::all().map_err(|_| CaptureError::WgcFailure())?;
    let target_window = windows.into_iter().find(|w| w.id().unwrap_or(0) as isize == foreground_hwnd.0 as isize);
    
    if let Some(target) = target_window {
        let image = target.capture_image().map_err(|_| CaptureError::WgcFailure())?;
        let width = image.width();
        let height = image.height();
        
        // Encode to PNG using image 0.24
        let mut bytes: Vec<u8> = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut bytes);
        // xcap might use image 0.25, so we get the raw bytes and recreate
        let raw = image.into_raw();
        if let Some(img) = image::RgbaImage::from_raw(width, height, raw) {
            img.write_to(&mut cursor, image::ImageFormat::Png).map_err(|_| CaptureError::WgcFailure())?;
        } else {
            return Err(CaptureError::WgcFailure());
        }
        
        let id = format!("win_{}", chrono::Utc::now().timestamp_millis());
        let asset = crate::asset::Asset {
            id: id.clone(),
            data: bytes,
            width,
            height,
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
            capture_mode: crate::diagnostics::CaptureMode::Window,
            capture_method: crate::diagnostics::CaptureMethod::WgcWindow,
            output_size: crate::diagnostics::PhysicalSize { w_px: width, h_px: height },
            monitor_id: String::new(),
            dpi: 96,
            process_name: target.app_name().ok().map(|s| s.to_string()),
            window_title: target.title().ok().map(|s| s.to_string()),
            bounds_physical: crate::diagnostics::PhysicalBounds {
                x: target.x().unwrap_or(0),
                y: target.y().unwrap_or(0),
                w: width,
                h: height,
            },
            asset_id: Some(id.clone()),
            error_class: None,
            error_code: None,
            duration_ms: 0,
        };
        crate::diagnostics::log_capture_event(app, &meta);
        
        Ok(())
    } else {
        Err(CaptureError::InvalidTarget())
    }
}
