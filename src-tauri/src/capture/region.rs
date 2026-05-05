use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::POINT;
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use xcap::Monitor;

// GDI imports for the current region-capture backend.
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HGDIOBJ, SRCCOPY,
};
use windows::Win32::UI::WindowsAndMessaging::GetDesktopWindow;

fn finish_session(app: &AppHandle) {
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }
}

pub fn capture_region(app: &AppHandle) -> Result<(), CaptureError> {
    let outcome = crate::capture::native_region_selector::show_selector(app)?;
    match outcome {
        crate::capture::native_region_selector::SelectionOutcome::Confirmed { gx, gy, gw, gh } => {
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
        "finish_region_capture (GDI): global_rect={}x{} at {},{}",
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

    // 2. Resolve intersecting monitors
    let monitors = Monitor::all().map_err(|e| {
        log::error!(target: "capture", "Monitor::all() failed: {:?}", e);
        let err = CaptureError::WgcFailure();
        emit_failure(
            app,
            &err,
            &start_time,
            crate::diagnostics::CaptureMethod::GdiBitblt,
        );
        finish_session(app);
        err
    })?;

    let intersecting_monitors: Vec<Monitor> = monitors
        .into_iter()
        .filter(|m| {
            let mx = m.x().unwrap_or(0);
            let my = m.y().unwrap_or(0);
            let mw = m.width().unwrap_or(0);
            let mh = m.height().unwrap_or(0);
            
            gx < mx + mw as i32 &&
            gx + gw as i32 > mx &&
            gy < my + mh as i32 &&
            gy + gh as i32 > my
        })
        .collect();

    if intersecting_monitors.is_empty() {
        let err = CaptureError::new(
            crate::capture::errors::CaptureErrorClass::InvalidTarget,
            "no_monitor_intersect",
            "Selected region does not intersect any monitor.",
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

    // 3. Session guard
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

    // 4. Capture prep (native selector is already closed, no need for hide_all/sleep)

    let center_gx = gx + (gw as i32 / 2);
    let center_gy = gy + (gh as i32 / 2);
    let center_monitor = intersecting_monitors
        .iter()
        .find(|m| {
            let mx = m.x().unwrap_or(0);
            let my = m.y().unwrap_or(0);
            let mw = m.width().unwrap_or(0);
            let mh = m.height().unwrap_or(0);
            center_gx >= mx && center_gx < mx + mw as i32 &&
            center_gy >= my && center_gy < my + mh as i32
        })
        .unwrap_or_else(|| intersecting_monitors.first().unwrap());

    let actual_dpi = center_monitor.scale_factor().unwrap_or(1.0);
    let dpi_pct = (actual_dpi * 100.0).round() as u32;
    let actual_monitor_id = center_monitor.name().unwrap_or_else(|_| "Unknown".to_string());

    // Region capture uses GDI directly on this machine because WGC monitor capture
    // has been the source of multi-second timeouts before the editor can open.
    let capture_method = crate::diagnostics::CaptureMethod::GdiBitblt;
    let final_image = capture_region_gdi(gx, gy, gw, gh).map_err(|ge| {
        log::error!(
            target: "capture",
            "Region GDI capture failed ({} monitors intersected): {}",
            intersecting_monitors.len(),
            ge
        );
        let err = CaptureError::WgcFailure();
        emit_failure(app, &err, &start_time, capture_method.clone());
        finish_session(app);
        err
    })?;

    let final_w = final_image.width();
    let final_h = final_image.height();
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    final_image.write_to(&mut cursor, image::ImageFormat::Png).map_err(|_| CaptureError::WgcFailure())?;

    let id = format!("reg_{}", chrono::Utc::now().timestamp_millis());
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset::new(id.clone(), bytes, final_w, final_h));
    }

    finish_session(app);
    app.emit("capture.result", serde_json::json!({ "asset_id": id })).ok();

    // Quick Access Metadata (using center monitor context)
    let monitor_work_area_logical = unsafe {
        let center = POINT { x: center_gx, y: center_gy };
        let hmonitor = MonitorFromPoint(center, MONITOR_DEFAULTTONEAREST);
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
                x: logical_i32(center_monitor.x().unwrap_or(0), dpi_pct),
                y: logical_i32(center_monitor.y().unwrap_or(0), dpi_pct),
                w: logical_u32(center_monitor.width().unwrap_or(1920), dpi_pct),
                h: logical_u32(center_monitor.height().unwrap_or(1080), dpi_pct),
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
        tokio::time::sleep(std::time::Duration::from_millis(25)).await;
        crate::quick_access::emit_show(&app_handle, &qa_asset_id, qa_meta);
    });

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method,
        output_size: crate::diagnostics::PhysicalSize { w_px: final_w, h_px: final_h },
        monitor_id: actual_monitor_id,
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


fn capture_region_gdi(x: i32, y: i32, w: u32, h: u32) -> Result<image::RgbaImage, String> {
    if w == 0 || h == 0 {
        return Err("Region dimensions must be non-zero".into());
    }

    unsafe {
        let hwnd = GetDesktopWindow();
        let hdc_screen = GetDC(Some(hwnd));
        if hdc_screen.0.is_null() {
            return Err("GetDC failed".into());
        }

        let hdc_mem = CreateCompatibleDC(Some(hdc_screen));
        if hdc_mem.0.is_null() {
            let _ = ReleaseDC(Some(hwnd), hdc_screen);
            return Err("CreateCompatibleDC failed".into());
        }

        let hbm = CreateCompatibleBitmap(hdc_screen, w as i32, h as i32);
        if hbm.0.is_null() {
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(Some(hwnd), hdc_screen);
            return Err("CreateCompatibleBitmap failed".into());
        }

        let hgdiobj = HGDIOBJ(hbm.0);
        let old_obj = SelectObject(hdc_mem, hgdiobj);

        let result = (|| -> Result<image::RgbaImage, String> {
            BitBlt(
                hdc_mem,
                0,
                0,
                w as i32,
                h as i32,
                Some(hdc_screen),
                x,
                y,
                SRCCOPY,
            )
            .map_err(|e| e.to_string())?;

            let bmi = BITMAPINFOHEADER {
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
            let copied = GetDIBits(
                hdc_mem,
                hbm,
                0,
                h,
                Some(buf.as_mut_ptr() as *mut _),
                (&mut bmi_header) as *mut _ as *mut _,
                DIB_RGB_COLORS,
            );

            if copied == 0 {
                return Err("GetDIBits failed".into());
            }

            for i in (0..buf.len()).step_by(4) {
                let b = buf[i];
                let r = buf[i + 2];
                buf[i] = r;
                buf[i + 2] = b;
            }

            image::RgbaImage::from_raw(w, h, buf)
                .ok_or_else(|| "Failed to create image from GDI buffer".into())
        })();

        let _ = SelectObject(hdc_mem, old_obj);
        let _ = DeleteObject(hgdiobj);
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(Some(hwnd), hdc_screen);

        result
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
        bounds_physical: crate::diagnostics::PhysicalBounds {
            x: 0,
            y: 0,
            w: 0,
            h: 0,
        },
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
