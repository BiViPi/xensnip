use crate::capture::errors::CaptureError;
use crate::capture::gdi_pixels::normalize_bgra_to_rgba_opaque;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::POINT;
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    GetMonitorInfoW, MonitorFromPoint, ReleaseDC, SelectObject, BITMAPINFOHEADER, BI_RGB,
    DIB_RGB_COLORS, HGDIOBJ, MONITORINFO, MONITOR_DEFAULTTONEAREST, SRCCOPY,
};
use windows::Win32::UI::HiDpi::{GetDpiForMonitor, MDT_EFFECTIVE_DPI};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

fn emit_failure(
    app: &AppHandle,
    err: &CaptureError,
    start_time: &std::time::Instant,
    monitor_id: String,
    dpi_pct: u32,
    bounds: crate::diagnostics::PhysicalBounds,
) {
    app.emit("capture.failure", err).ok();
    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Fullscreen,
        capture_method: crate::diagnostics::CaptureMethod::GdiMonitor,
        output_size: crate::diagnostics::PhysicalSize {
            w_px: bounds.w,
            h_px: bounds.h,
        },
        monitor_id,
        dpi: dpi_pct,
        process_name: None,
        window_title: None,
        bounds_physical: bounds,
        asset_id: None,
        error_class: Some(format!("{:?}", err.class)),
        error_code: Some(err.code.clone()),
        duration_ms: start_time.elapsed().as_millis() as u32,
        delay_requested_ms: None,
        delay_actual_ms: None,
    };
    crate::diagnostics::log_capture_event(app, &meta);
}

pub fn capture_current_monitor(app: &AppHandle) -> Result<(), CaptureError> {
    let start_time = std::time::Instant::now();

    let mut cursor = POINT::default();
    unsafe {
        if GetCursorPos(&mut cursor).is_err() {
            let err = CaptureError::new(
                crate::capture::errors::CaptureErrorClass::WindowUnavailable,
                "cursor_unavailable",
                "Could not resolve the current cursor position.",
            );
            emit_failure(
                app,
                &err,
                &start_time,
                String::new(),
                100,
                crate::diagnostics::PhysicalBounds {
                    x: 0,
                    y: 0,
                    w: 0,
                    h: 0,
                },
            );
            return Err(err);
        }
    }

    let (monitor_bounds, work_bounds, dpi_pct, monitor_id) = unsafe {
        let hmonitor = MonitorFromPoint(cursor, MONITOR_DEFAULTTONEAREST);
        let mut monitor_info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(hmonitor, &mut monitor_info).as_bool() {
            return Err(CaptureError::InvalidTarget());
        }

        let mut dpi_x = 0;
        let mut dpi_y = 0;
        let _ = GetDpiForMonitor(hmonitor, MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y);
        let raw_dpi = if dpi_x == 0 { 96 } else { dpi_x };
        let dpi_pct = crate::capture::dpi::dpi_percent_from_raw(raw_dpi);

        let monitor = monitor_info.rcMonitor;
        let work = monitor_info.rcWork;
        Ok::<_, CaptureError>((
            crate::diagnostics::PhysicalBounds {
                x: monitor.left,
                y: monitor.top,
                w: (monitor.right - monitor.left) as u32,
                h: (monitor.bottom - monitor.top) as u32,
            },
            crate::quick_access::MonitorWorkAreaLogical {
                x: crate::capture::dpi::physical_to_logical_i32(work.left, dpi_pct),
                y: crate::capture::dpi::physical_to_logical_i32(work.top, dpi_pct),
                w: crate::capture::dpi::physical_to_logical_u32(
                    (work.right - work.left) as u32,
                    dpi_pct,
                ),
                h: crate::capture::dpi::physical_to_logical_u32(
                    (work.bottom - work.top) as u32,
                    dpi_pct,
                ),
            },
            dpi_pct,
            format!("monitor_{}x{}", monitor.left, monitor.top),
        ))
    }?;

    let image = capture_monitor_gdi(&monitor_bounds).map_err(|message| {
        let err = CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "fullscreen_capture_failed",
            "Current monitor capture failed.",
        );
        log::error!(target: "capture", "Current monitor capture failed: {}", message);
        emit_failure(
            app,
            &err,
            &start_time,
            monitor_id.clone(),
            dpi_pct,
            monitor_bounds.clone(),
        );
        err
    })?;

    let output_w = image.width();
    let output_h = image.height();
    let mut cursor = std::io::Cursor::new(Vec::new());
    let encoder = image::codecs::png::PngEncoder::new_with_quality(
        &mut cursor,
        image::codecs::png::CompressionType::Fast,
        image::codecs::png::FilterType::NoFilter,
    );
    image.write_with_encoder(encoder).map_err(|err| {
        let capture_err = CaptureError::WgcFailure();
        log::warn!(target: "capture", "Fullscreen PNG encode failed: {:?}", err);
        emit_failure(
            app,
            &capture_err,
            &start_time,
            monitor_id.clone(),
            dpi_pct,
            monitor_bounds.clone(),
        );
        capture_err
    })?;

    let asset_id = format!("full_{}", chrono::Utc::now().timestamp_millis());
    let png_bytes = Arc::new(cursor.into_inner());
    if let Some(registry) = app.try_state::<crate::asset::AssetRegistry>() {
        registry.insert(crate::asset::Asset::new(
            asset_id.clone(),
            png_bytes,
            output_w,
            output_h,
        ));
    }

    app.emit(
        "capture.result",
        serde_json::json!({ "asset_id": asset_id }),
    )
    .ok();

    crate::quick_access::emit_show(
        app,
        &asset_id,
        crate::quick_access::CapturePositionMeta {
            monitor_work_area_logical: work_bounds,
            monitor_dpi: dpi_pct,
            capture_kind: "fullscreen".to_string(),
            capture_rect_logical: None,
        },
    );

    let meta = crate::diagnostics::CaptureMetadata {
        capture_mode: crate::diagnostics::CaptureMode::Fullscreen,
        capture_method: crate::diagnostics::CaptureMethod::GdiMonitor,
        output_size: crate::diagnostics::PhysicalSize {
            w_px: output_w,
            h_px: output_h,
        },
        monitor_id,
        dpi: dpi_pct,
        process_name: None,
        window_title: None,
        bounds_physical: crate::diagnostics::PhysicalBounds {
            x: monitor_bounds.x,
            y: monitor_bounds.y,
            w: output_w,
            h: output_h,
        },
        asset_id: Some(asset_id),
        error_class: None,
        error_code: None,
        duration_ms: start_time.elapsed().as_millis() as u32,
        delay_requested_ms: None,
        delay_actual_ms: None,
    };
    crate::diagnostics::log_capture_event(app, &meta);

    Ok(())
}

fn capture_monitor_gdi(
    bounds: &crate::diagnostics::PhysicalBounds,
) -> Result<image::RgbaImage, String> {
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

        let hbm = CreateCompatibleBitmap(hdc_screen, bounds.w as i32, bounds.h as i32);
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
            bounds.w as i32,
            bounds.h as i32,
            Some(hdc_screen),
            bounds.x,
            bounds.y,
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

        let mut bmi = windows::Win32::Graphics::Gdi::BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: bounds.w as i32,
                biHeight: -(bounds.h as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };

        let mut bgra = vec![0u8; (bounds.w * bounds.h * 4) as usize];
        let got = GetDIBits(
            hdc_mem,
            hbm,
            0,
            bounds.h,
            Some(bgra.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        let _ = SelectObject(hdc_mem, old_obj);
        let _ = DeleteObject(hgdiobj);
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(None, hdc_screen);

        if got == 0 {
            return Err("GetDIBits returned zero scanlines".into());
        }

        normalize_bgra_to_rgba_opaque(&mut bgra);
        image::RgbaImage::from_raw(bounds.w, bounds.h, bgra)
            .ok_or_else(|| "Failed to create image buffer".into())
    }
}
