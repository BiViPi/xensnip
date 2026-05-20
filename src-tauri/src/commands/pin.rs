use crate::asset::{Asset, AssetRegistry};
use image::GenericImageView;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{webview::PageLoadEvent, AppHandle, Manager, WebviewWindowBuilder};
use uuid::Uuid;

#[derive(Default)]
pub struct PinRegistry {
    pub map: Mutex<HashMap<String, String>>, // pin_id -> asset_id
}

#[derive(Serialize)]
pub struct PinCreateResult {
    pub pin_id: String,
    pub asset_id: String,
}

fn decode_png_dimensions(png_bytes: &[u8]) -> Result<(u32, u32), String> {
    image::load_from_memory_with_format(png_bytes, image::ImageFormat::Png)
        .map(|img| img.dimensions())
        .map_err(|e| format!("Failed to decode pinned PNG dimensions: {e}"))
}

#[tauri::command]
pub fn pin_create(app: AppHandle, png_bytes: Vec<u8>) -> Result<PinCreateResult, String> {
    let pin_id = format!("pin-{}", Uuid::new_v4());
    let asset_id = format!("pin-asset-{}", Uuid::new_v4());
    let (width, height) = decode_png_dimensions(&png_bytes)?;
    log::info!(
        target: "pin",
        "pin_create start pin_id={} asset_id={} png_bytes={} decoded={}x{}",
        pin_id,
        asset_id,
        png_bytes.len(),
        width,
        height
    );

    // 1. Register asset
    let registry = app.state::<AssetRegistry>();
    let asset = Asset::new(
        asset_id.clone(),
        std::sync::Arc::new(png_bytes),
        width,
        height,
    );
    registry.insert_with_consumer(asset, &pin_id);

    // 2. Track in PinRegistry
    let pin_registry = app.state::<PinRegistry>();
    pin_registry
        .map
        .lock()
        .unwrap()
        .insert(pin_id.clone(), asset_id.clone());

    // 3. Compute clamped size
    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| {
            // Fallback if no primary monitor found
            // Just provide a dummy, though shouldn't happen
            app.available_monitors()
                .unwrap_or_default()
                .into_iter()
                .next()
                .unwrap()
        });

    let scale_factor = monitor.scale_factor();
    let monitor_size = monitor.size();
    let max_w = (monitor_size.width as f64 / scale_factor * 0.6) as u32;
    let max_h = (monitor_size.height as f64 / scale_factor * 0.6) as u32;

    let mut target_w = width as f64;
    let mut target_h = height as f64;

    if target_w > max_w as f64 {
        let ratio = max_w as f64 / target_w;
        target_w = max_w as f64;
        target_h *= ratio;
    }
    if target_h > max_h as f64 {
        let ratio = max_h as f64 / target_h;
        target_h = max_h as f64;
        target_w *= ratio;
    }

    let target_w = target_w.max(120.0);
    let target_h = target_h.max(80.0);

    // 4. Position: cascade slightly
    let pin_count = pin_registry.map.lock().unwrap().len() as f64;
    let cascade_offset = (pin_count - 1.0).max(0.0) * 32.0;

    // offset from top-right
    let monitor_pos = monitor.position();
    let top_right_x =
        (monitor_pos.x as f64 / scale_factor) + (monitor_size.width as f64 / scale_factor);
    let top_right_y = monitor_pos.y as f64 / scale_factor;

    let pos_x =
        (top_right_x - target_w - 24.0 - cascade_offset).max(monitor_pos.x as f64 / scale_factor);
    let pos_y = (top_right_y + 24.0 + cascade_offset).min(
        (monitor_pos.y as f64 / scale_factor) + (monitor_size.height as f64 / scale_factor)
            - target_h,
    );

    // 5. Create window
    log::info!(
        target: "pin",
        "pin_create url=pin.html?pin_id={}&asset_id={} target_size={}x{} pos=({}, {})",
        pin_id,
        asset_id,
        target_w as u32,
        target_h as u32,
        pos_x,
        pos_y
    );

    let app_for_window = app.clone();
    let pin_id_for_window = pin_id.clone();
    let pin_id_for_log = pin_id.clone();
    let asset_id_for_log = asset_id.clone();
    let pin_id_for_async = pin_id.clone();
    let asset_id_for_async = asset_id.clone();
    let target_w_for_window = target_w;
    let target_h_for_window = target_h;
    let pos_x_for_window = pos_x;
    let pos_y_for_window = pos_y;

    let init_script = format!(
        "window.__XENSNIP_PIN_BOOTSTRAP__ = Object.freeze({});",
        serde_json::json!({
            "pinId": pin_id.clone(),
            "assetId": asset_id.clone(),
        })
    );

    log::info!(target: "pin", "pin_create scheduling async main-thread window build");
    tauri::async_runtime::spawn(async move {
        let app_for_closure = app_for_window.clone();
        let init_script_for_window = init_script.clone();
        let pin_id_for_closure_error = pin_id_for_log.clone();
        let asset_id_for_closure_error = asset_id_for_log.clone();
        let result = app_for_window.run_on_main_thread(move || {
            log::info!(target: "pin", "pin_create building window on main thread label={}", pin_id_for_window);
            let builder = WebviewWindowBuilder::new(
                &app_for_closure,
                &pin_id_for_window,
                tauri::WebviewUrl::App("pin.html".into()),
            )
            .initialization_script(&init_script_for_window)
            .on_page_load(|window, payload| {
                let event = match payload.event() {
                    PageLoadEvent::Started => "started",
                    PageLoadEvent::Finished => "finished",
                };
                log::info!(
                    target: "pin",
                    "pin_page_load label={} event={} url={}",
                    window.label(),
                    event,
                    payload.url()
                );
            })
            .title(&pin_id_for_window)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .resizable(false)
            .min_inner_size(120.0, 80.0)
            .inner_size(target_w_for_window, target_h_for_window)
            .position(pos_x_for_window, pos_y_for_window);

            log::info!(target: "pin", "pin_create calling builder.build label={}", pin_id_for_window);
            match builder.build() {
                Ok(window) => {
                    let _ = crate::apply_window_native_style(&window);
                    log::info!(target: "pin", "pin_create window build complete label={}", window.label());
                }
                Err(err) => {
                    log::error!(
                        target: "pin",
                        "pin_create window build failed pin_id={} asset_id={} err={}",
                        pin_id_for_closure_error,
                        asset_id_for_closure_error,
                        err
                    );
                    let pin_registry = app_for_closure.state::<PinRegistry>();
                    pin_registry
                        .map
                        .lock()
                        .unwrap()
                        .remove(&pin_id_for_closure_error);
                    let asset_registry = app_for_closure.state::<AssetRegistry>();
                    let _ = asset_registry.release(
                        &asset_id_for_closure_error,
                        &pin_id_for_closure_error,
                    );
                }
            }
        });

        if let Err(err) = result {
            log::error!(
                target: "pin",
                "pin_create run_on_main_thread failed pin_id={} asset_id={} err={}",
                pin_id_for_async,
                asset_id_for_async,
                err
            );
            let pin_registry = app_for_window.state::<PinRegistry>();
            pin_registry.map.lock().unwrap().remove(&pin_id_for_async);
            let asset_registry = app_for_window.state::<AssetRegistry>();
            let _ = asset_registry.release(&asset_id_for_async, &pin_id_for_async);
        }
    });

    log::info!(
        target: "pin",
        "pin_create dispatched pin_id={} asset_id={} w={} h={}",
        pin_id,
        asset_id,
        target_w as u32,
        target_h as u32
    );

    Ok(PinCreateResult { pin_id, asset_id })
}

#[tauri::command]
pub fn pin_close(app: AppHandle, pin_id: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&pin_id) {
        let _ = window.close();
    }
    // Cleanup will be handled by the window event listener
    Ok(())
}

#[tauri::command]
pub fn pin_get_asset_id(app: AppHandle, pin_id: String) -> Result<String, String> {
    let pin_registry = app.state::<PinRegistry>();
    let map = pin_registry.map.lock().unwrap();
    map.get(&pin_id)
        .cloned()
        .ok_or_else(|| format!("Pin not found for ID: {}", pin_id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::asset::{Asset, AssetRegistry};
    use image::{DynamicImage, ImageOutputFormat, RgbaImage};
    use std::io::Cursor;
    use std::sync::Arc;

    #[test]
    fn test_pin_registry_insert_remove() {
        let registry = PinRegistry::default();
        registry
            .map
            .lock()
            .unwrap()
            .insert("pin-1".into(), "asset-1".into());
        assert_eq!(
            registry.map.lock().unwrap().get("pin-1").unwrap(),
            "asset-1"
        );
        let removed = registry.map.lock().unwrap().remove("pin-1");
        assert_eq!(removed.unwrap(), "asset-1");
        assert!(registry.map.lock().unwrap().is_empty());
    }

    #[test]
    fn test_asset_registry_insert_with_consumer() {
        let registry = AssetRegistry::new();
        let asset = Asset::new("a1".into(), Arc::new(vec![1, 2, 3]), 10, 10);
        registry.insert_with_consumer(asset, "pin-1");

        let data = registry.get_data("a1");
        assert!(data.is_some());

        // Assert that we can release it with pin-1 and it gets dropped
        let release_result = registry.release("a1", "pin-1");
        assert!(release_result.is_ok());

        // Should be dropped
        assert!(registry.get_data("a1").is_none());
    }

    #[test]
    fn test_pin_get_asset_id_logic() {
        let registry = PinRegistry::default();
        registry
            .map
            .lock()
            .unwrap()
            .insert("p1".into(), "a1".into());

        let map = registry.map.lock().unwrap();
        let asset = map.get("p1").cloned().unwrap();
        assert_eq!(asset, "a1");

        let not_found = map.get("p2");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_decode_png_dimensions() {
        let image = DynamicImage::ImageRgba8(RgbaImage::new(320, 180));
        let mut bytes = Vec::new();
        image
            .write_to(&mut Cursor::new(&mut bytes), ImageOutputFormat::Png)
            .unwrap();

        let (width, height) = decode_png_dimensions(&bytes).unwrap();
        assert_eq!((width, height), (320, 180));
    }
}
