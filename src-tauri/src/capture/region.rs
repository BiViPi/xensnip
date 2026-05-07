use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::Foundation::POINT;
use std::sync::Arc;

// GDI imports for the current region-capture backend.
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HGDIOBJ, SRCCOPY,
};

fn finish_session(app: &AppHandle) {
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }
}

pub fn capture_region(app: &AppHandle) -> Result<(), CaptureError> {
    let outcome = crate::capture::native_region_selector::show_selector(app)?;
    match outcome {
        crate::capture::native_region_selector::SelectionOutcome::Confirmed { gx, gy, gw, gh } => {
            log::info!(target: "perf", "Region selection confirmed");
            finish_region_capture(app, gx, gy, gw, gh)
        }
        crate::capture::native_region_selector::SelectionOutcome::Cancelled => Ok(()),
    }
}

/// Finalize region capture and trigger the region-capture backend.
/// Region capture currently uses GDI BitBlt directly to avoid WGC monitor timeouts.
pub fn finish_region_capture(
    app: &AppHandle,
    gx: i32,
    gy: i32,
    gw: u32,
    gh: u32,
) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();
    log::info!(
        target: "capture",
        "finish_region_capture (GDI Optimized): global_rect={}x{} at {},{}",
        gw,
        gh,
        gx,
        gy
    );

    // 1. Basic validation: rect too small
    if gw < 10 || gh < 10 {
        log::warn!(target: "capture", "finish_region_capture rejected: rect too small ({}x{})", gw, gh);
        let err = CaptureError::new(
            crate::capture::errors::CaptureErrorClass::InvalidTarget,
            "rect_too_small",
            "Selected region is too small.",
        );
        emit_failure(
            app,
            &err,
            &start_time,
            crate::diagnostics::CaptureMethod::GdiBitblt,
        );
        finish_session(app);
        return Err(err);
    }

    // 2. Session guard
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        let mut intent = session.intent.lock().unwrap();
        match intent.clone() {
            crate::capture::CaptureIntent::None => return Ok(()),
            crate::capture::CaptureIntent::RegionConfirming => return Ok(()),
            crate::capture::CaptureIntent::Region => {
                *intent = crate::capture::CaptureIntent::RegionConfirming;
            }
            _ => return Ok(()),
        }
    }

    // 3. Resolve monitor context and DPI via Win32 for maximum speed (no xcap Monitor::all() overhead)
    let center_gx = gx + (gw as i32 / 2);
    let center_gy = gy + (gh as i32 / 2);
    
    // SAFETY: Win32 monitor APIs are called with valid coordinates derived from the selection.
    // MonitorFromPoint guarantees a non-null HMONITOR with MONITOR_DEFAULTTONEAREST.
    let (hmonitor, dpi_pct, monitor_name) = unsafe {
        let center = POINT { x: center_gx, y: center_gy };
        let hmon = MonitorFromPoint(center, MONITOR_DEFAULTTONEAREST);
        
        let mut dpi_x = 0;
        let mut dpi_y = 0;
        let _ = GetDpiForMonitor(hmon, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y);
        let raw_dpi = if dpi_x == 0 { 96 } else { dpi_x };
        let dpi_pct = ((raw_dpi as f64 / 96.0) * 100.0).round() as u32;

        let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
        let name = if GetMonitorInfoW(hmon, &mut mi).as_bool() {
            format!("monitor_{}x{}", mi.rcMonitor.left, mi.rcMonitor.top)
        } else {
            "Generic Monitor".to_string()
        };

        (hmon, dpi_pct, name)
    };
    log::info!(target: "perf", "Monitor resolution via Win32 took {}ms (DPI: {})", start_time.elapsed().as_millis(), dpi_pct);

    // 4. Capture prep (native selector is already closed, no need for hide_all/sleep)
    let capture_method = crate::diagnostics::CaptureMethod::GdiBitblt;
    let gdi_start = std::time::Instant::now();
    let final_image = capture_region_gdi(gx, gy, gw, gh).map_err(|ge| {
        log::error!(target: "capture", "Region GDI capture failed: {}", ge);
        let err = CaptureError::WgcFailure();
        emit_failure(app, &err, &start_time, capture_method.clone());
        finish_session(app);
        err
    })?;
    log::info!(target: "perf", "GDI capture took {}ms", gdi_start.elapsed().as_millis());

    let final_w = final_image.width();
    let final_h = final_image.height();
    
    let encode_start = std::time::Instant::now();
    let mut cursor = std::io::Cursor::new(Vec::new());
    
    // Fast compression for lower latency
    let encoder = image::codecs::png::PngEncoder::new_with_quality(
        &mut cursor,
        image::codecs::png::CompressionType::Fast,
        image::codecs::png::FilterType::NoFilter,
    );
    final_image.write_with_encoder(encoder).map_err(|e| {
        log::error!(target: "capture", "PNG encode failed: {:?}", e);
        CaptureError::WgcFailure()
    })?;
    
    let png_bytes = Arc::new(cursor.into_inner());
    log::info!(target: "perf", "PNG encoding (Fast) took {}ms", encode_start.elapsed().as_millis());

    let id = format!("reg_{}", chrono::Utc::now().timestamp_millis());
    let insert_start = std::time::Instant::now();
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset::new(id.clone(), png_bytes, final_w, final_h));
    }
    log::info!(target: "perf", "Asset registry insert took {}ms", insert_start.elapsed().as_millis());

    finish_session(app);
    app.emit("capture.result", serde_json::json!({ "asset_id": id })).ok();

    // Quick Access Metadata
    // SAFETY: hmonitor is guaranteed valid at this point from the previous resolve step.
    let monitor_work_area_logical = unsafe {
        let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
        if GetMonitorInfoW(hmonitor, &mut mi).as_bool() {
            let work = mi.rcWork;
            crate::quick_access::MonitorWorkAreaLogical {
                x: logical_i32(work.left, dpi_pct),
                y: logical_i32(work.top, dpi_pct),
                w: logical_u32((work.right - work.left) as u32, dpi_pct),
                h: logical_u32((work.bottom - work.top) as u32, dpi_pct),
            }
        } else {
            crate::quick_access::MonitorWorkAreaLogical {
                x: logical_i32(gx, dpi_pct),
                y: logical_i32(gy, dpi_pct),
                w: logical_u32(1920, dpi_pct),
                h: logical_u32(1080, dpi_pct),
            }
        }
    };

    let qa_meta = crate::quick_access::CapturePositionMeta {
        monitor_work_area_logical,
        monitor_dpi: dpi_pct,
        capture_kind: "region".to_string(),
        capture_rect_logical: Some(crate::quick_access::CaptureRectLogical {
            x: logical_i32(gx, dpi_pct),
            y: logical_i32(gy, dpi_pct),
            w: logical_u32(final_w, dpi_pct),
            h: logical_u32(final_h, dpi_pct),
        }),
    };

    let app_handle = app.clone();
    let qa_asset_id = id.clone();
    tauri::async_runtime::spawn(async move {
        let emit_delay_start = std::time::Instant::now();
        // Still keep a small delay to avoid focus race between native selector destruction and QA window showing.
        tokio::time::sleep(std::time::Duration::from_millis(25)).await;
        log::info!(target: "perf", "emit_show delay took {}ms", emit_delay_start.elapsed().as_millis());
        crate::quick_access::emit_show(&app_handle, &qa_asset_id, qa_meta);
    });

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method,
        output_size: crate::diagnostics::PhysicalSize { w_px: final_w, h_px: final_h },
        monitor_id: monitor_name,
        dpi: dpi_pct,
        process_name: None,
        window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds { x: gx, y: gy, w: final_w, h: final_h },
        asset_id: Some(id.clone()),
        error_class: None,
        error_code: None,
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);

    Ok(())
}

fn capture_region_gdi(gx: i32, gy: i32, gw: u32, gh: u32) -> Result<image::RgbaImage, String> {
    unsafe {
        let hdc_screen = GetDC(None);
        if hdc_screen.0.is_null() {
            return Err("GetDC failed".into());
        }

        let hdc_mem = CreateCompatibleDC(Some(hdc_screen));
        if hdc_mem.0.is_null() {
            let _ = ReleaseDC(None, hdc_screen);
            return Err("CreateCompatibleDC failed".into());
        }

        let hbm = CreateCompatibleBitmap(hdc_screen, gw as i32, gh as i32);
        if hbm.0.is_null() {
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(None, hdc_screen);
            return Err("CreateCompatibleBitmap failed".into());
        }

        let hgdiobj = HGDIOBJ(hbm.0);
        let old_obj = SelectObject(hdc_mem, hgdiobj);

        if BitBlt(
            hdc_mem,
            0,
            0,
            gw as i32,
            gh as i32,
            Some(hdc_screen),
            gx,
            gy,
            SRCCOPY,
        )
        .is_err()
        {
            let _ = SelectObject(hdc_mem, old_obj);
            let _ = DeleteObject(hgdiobj);
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(None, hdc_screen);
            return Err("BitBlt failed".into());
        }

        let bmi = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: gw as i32,
            biHeight: -(gh as i32), // Top-down
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        };

        let mut buf = vec![0u8; (gw * gh * 4) as usize];
        let mut bmi_header = bmi;
        let copied = GetDIBits(
            hdc_mem,
            hbm,
            0,
            gh,
            Some(buf.as_mut_ptr() as *mut _),
            (&mut bmi_header) as *mut _ as *mut _,
            DIB_RGB_COLORS,
        );

        let _ = SelectObject(hdc_mem, old_obj);
        let _ = DeleteObject(hgdiobj);
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(None, hdc_screen);

        if copied == 0 {
            return Err("GetDIBits failed".into());
        }

        // Swap BGR to RGB
        for i in (0..buf.len()).step_by(4) {
            let b = buf[i];
            let r = buf[i + 2];
            buf[i] = r;
            buf[i + 2] = b;
        }

        image::RgbaImage::from_raw(gw, gh, buf)
            .ok_or_else(|| "Failed to create image from GDI buffer".into())
    }
}

fn emit_failure(
    app: &AppHandle,
    err: &CaptureError,
    start_time: &std::time::Instant,
    method: crate::diagnostics::CaptureMethod,
) {
    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method: method,
        output_size: crate::diagnostics::PhysicalSize { w_px: 0, h_px: 0 },
        monitor_id: String::new(),
        dpi: 0,
        process_name: None,
        window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds { x: 0, y: 0, w: 0, h: 0 },
        asset_id: None,
        error_class: Some(format!("{:?}", err.class)),
        error_code: Some(err.code.clone()),
        duration_ms: start_time.elapsed().as_millis() as u32,
    };
    crate::diagnostics::log_capture_event(app, &meta);
    app.emit("capture.failure", err).ok();
}

fn logical_i32(value: i32, dpi_pct: u32) -> i32 {
    if dpi_pct <= 100 {
        return value;
    }
    ((value as f64) / (dpi_pct as f64 / 100.0)).round() as i32
}

fn logical_u32(value: u32, dpi_pct: u32) -> u32 {
    if dpi_pct <= 100 {
        return value;
    }
    ((value as f64) / (dpi_pct as f64 / 100.0)).round() as u32
}
