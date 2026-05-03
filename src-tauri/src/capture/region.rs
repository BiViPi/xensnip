use crate::capture::errors::CaptureError;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::POINT;
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use xcap::Monitor;

// GDI Imports for fallback
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
    let settings = crate::settings::load_or_create_default(app);
    let monitors = Monitor::all().map_err(|e| {
        log::error!(target: "capture", "Monitor::all() failed: {:?}", e);
        CaptureError::WgcFailure()
    })?;

    if settings.capture_all_monitors {
        crate::overlay::show_all(app, monitors)
    } else {
        // Fallback to primary monitor only
        let primary = monitors
            .iter()
            .find(|m| m.is_primary().unwrap_or(false))
            .or_else(|| monitors.first())
            .ok_or_else(|| CaptureError::InvalidTarget())?;
        crate::overlay::show_all(app, vec![primary.clone()])
    }
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
    log::info!(target: "capture", "finish_region_capture: rect={}x{} at {},{} monitor_id={}", w, h, x, y, monitor_id);

    // 1. Basic validation: rect too small
    if w < 10 || h < 10 {
        log::warn!(target: "capture", "finish_region_capture rejected: rect too small ({}x{})", w, h);
        let err = CaptureError::new(
            crate::capture::errors::CaptureErrorClass::InvalidTarget,
            "rect_too_small",
            "Selected region is too small.",
        );
        emit_failure(
            app,
            &err,
            &start_time,
            crate::diagnostics::CaptureMethod::WgcMonitor,
        );
        // DO NOT finish session here; let other overlays try.
        return Err(err);
    }

    // 2. Resolve target monitor
    let monitors = Monitor::all().map_err(|e| {
        log::error!(target: "capture", "Monitor::all() failed: {:?}", e);
        let err = CaptureError::WgcFailure();
        emit_failure(
            app,
            &err,
            &start_time,
            crate::diagnostics::CaptureMethod::WgcMonitor,
        );
        err
    })?;

    let target_monitor = if !monitor_id.is_empty() {
        monitors
            .iter()
            .find(|m| {
                m.id()
                    .map(|id| id.to_string())
                    .ok()
                    .as_ref()
                    == Some(&monitor_id)
            })
            .ok_or_else(|| {
                let err = CaptureError::new(
                    crate::capture::errors::CaptureErrorClass::InvalidTarget,
                    "monitor_not_found",
                    &format!("Monitor with id '{}' not found.", monitor_id),
                );
                emit_failure(
                    app,
                    &err,
                    &start_time,
                    crate::diagnostics::CaptureMethod::WgcMonitor,
                );
                err
            })?
    } else {
        monitors.first().ok_or_else(|| {
            let err = CaptureError::InvalidTarget();
            emit_failure(
                app,
                &err,
                &start_time,
                crate::diagnostics::CaptureMethod::WgcMonitor,
            );
            err
        })?
    };

    // 3. First-successful-confirm-wins guard: reserve the session for one in-flight confirm
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        let mut intent = session.intent.lock().unwrap();
        match intent.clone() {
            crate::capture::CaptureIntent::None => {
                log::info!(target: "capture", "finish_region_capture: Session already finalized, ignoring.");
                return Ok(());
            }
            crate::capture::CaptureIntent::RegionConfirming => {
                log::info!(target: "capture", "finish_region_capture: Another confirm is already in-flight, ignoring.");
                return Ok(());
            }
            crate::capture::CaptureIntent::Region => {
                *intent = crate::capture::CaptureIntent::RegionConfirming;
                log::info!(target: "capture", "Session reserved by in-flight region confirm.");
            }
            other => {
                log::warn!(target: "capture", "finish_region_capture: Unexpected session state {:?}, ignoring.", other);
                return Ok(());
            }
        }
    }

    // 4. Proceed with capture
    crate::overlay::hide_all(app);

    // Settle delay (allow overlay to disappear before GDI/WGC starts)
    std::thread::sleep(std::time::Duration::from_millis(200));

    let actual_monitor_id = target_monitor.name().unwrap_or_default();
    let actual_dpi = target_monitor.scale_factor().unwrap_or(1.0);
    let dpi_pct = (actual_dpi * 100.0).round() as u32;

    let target_monitor_x = target_monitor.x().unwrap_or(0);
    let target_monitor_y = target_monitor.y().unwrap_or(0);

    // Coordinate conversion: monitor-local physical -> desktop-global physical
    let global_x = target_monitor_x + x;
    let global_y = target_monitor_y + y;

    log::info!(target: "capture", "Coordinate translation: local({}, {}) -> global({}, {}) via monitor offset({}, {})", 
        x, y, global_x, global_y, target_monitor_x, target_monitor_y);

    let mut capture_method = crate::diagnostics::CaptureMethod::WgcMonitor;

    // Path 1: Try WGC Monitor Capture
    log::info!(target: "capture", "Attempting WGC capture on monitor: {}", actual_monitor_id);
    let image_res = target_monitor.capture_image();

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
                finish_session(app);
                return Err(err);
            }
        }
        Err(e) => {
            log::warn!(target: "capture", "WGC Monitor capture failed ({:?}), falling back to GDI BitBlt...", e);
            capture_method = crate::diagnostics::CaptureMethod::GdiBitblt;

            capture_region_gdi(global_x, global_y, w, h).map_err(|ge| {
                log::error!(target: "capture", "GDI fallback failed: {}", ge);
                let err = CaptureError::WgcFailure();
                emit_failure(app, &err, &start_time, capture_method.clone());
                finish_session(app);
                err
            })?
        }
    };

    let final_w = final_image.width();
    let final_h = final_image.height();
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    final_image
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| {
            log::error!(target: "capture", "Failed to encode region capture as PNG: {:?}", e);
            let err = CaptureError::WgcFailure();
            emit_failure(app, &err, &start_time, capture_method.clone());
            finish_session(app);
            err
        })?;

    let id = format!("reg_{}", chrono::Utc::now().timestamp_millis());
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset::new(
            id.clone(),
            bytes,
            final_w,
            final_h,
        ));
    }

    finish_session(app);

    app.emit("capture.result", serde_json::json!({ "asset_id": id }))
        .ok();

    // Build CapturePositionMeta for quick_access.show using monitor work area.
    let monitor_work_area_logical = unsafe {
        // Use the center of the captured region to find the monitor.
        let center = POINT {
            x: global_x + (w as i32 / 2),
            y: global_y + (h as i32 / 2),
        };
        let hmonitor = MonitorFromPoint(center, MONITOR_DEFAULTTONEAREST);
        let mut mi = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if GetMonitorInfoW(hmonitor, &mut mi).as_bool() {
            let work = mi.rcWork;
            crate::quick_access::MonitorWorkAreaLogical {
                x: logical_i32(work.left, dpi_pct),
                y: logical_i32(work.top, dpi_pct),
                w: logical_u32((work.right - work.left) as u32, dpi_pct),
                h: logical_u32((work.bottom - work.top) as u32, dpi_pct),
            }
        } else {
            // Fallback to full monitor rect from xcap.
            crate::quick_access::MonitorWorkAreaLogical {
                x: logical_i32(target_monitor.x().unwrap_or(0), dpi_pct),
                y: logical_i32(target_monitor.y().unwrap_or(0), dpi_pct),
                w: logical_u32(target_monitor.width().unwrap_or(1920), dpi_pct),
                h: logical_u32(target_monitor.height().unwrap_or(1080), dpi_pct),
            }
        }
    };

    let qa_meta = crate::quick_access::CapturePositionMeta {
        monitor_work_area_logical,
        monitor_dpi: dpi_pct,
        capture_kind: "region".to_string(),
        capture_rect_logical: Some(crate::quick_access::CaptureRectLogical {
            x: logical_i32(global_x, dpi_pct),
            y: logical_i32(global_y, dpi_pct),
            w: logical_u32(final_w, dpi_pct),
            h: logical_u32(final_h, dpi_pct),
        }),
    };

    // Region confirm is invoked from the overlay webview. Opening QA synchronously here can
    // stall inside WebviewWindowBuilder::build() before the IPC returns. Defer QA spawn until
    // after this command unwinds.
    let app_handle = app.clone();
    let qa_asset_id = id.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(25)).await;
        log::info!(target: "capture", "deferred quick access emit start asset_id={}", qa_asset_id);
        eprintln!("[qa-debug] deferred quick access emit start asset_id={}", qa_asset_id);
        crate::quick_access::emit_show(&app_handle, &qa_asset_id, qa_meta);
    });

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Region,
        capture_method,
        output_size: crate::diagnostics::PhysicalSize {
            w_px: final_w,
            h_px: final_h,
        },
        monitor_id: actual_monitor_id,
        dpi: dpi_pct,
        process_name: None,
        window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds {
            x: global_x,
            y: global_y,
            w: final_w,
            h: final_h,
        },
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
