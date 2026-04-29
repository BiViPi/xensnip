use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Serialize, Clone)]
pub enum CaptureMode {
    Region,
    Window,
}

#[derive(Debug, Serialize, Clone)]
pub enum CaptureMethod {
    WgcWindow,
    WgcMonitor,
    GdiBitblt,
    Other(String),
}

#[derive(Debug, Serialize, Clone)]
pub struct PhysicalSize {
    pub w_px: u32,
    pub h_px: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct PhysicalBounds {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct CaptureMetadata {
    pub capture_mode: CaptureMode,
    pub capture_method: CaptureMethod,
    pub output_size: PhysicalSize,
    pub monitor_id: String,
    pub dpi: u32,
    pub process_name: Option<String>,
    pub window_title: Option<String>,
    pub bounds_physical: PhysicalBounds,
    pub asset_id: Option<String>,
    pub error_class: Option<String>,
    pub error_code: Option<String>,
    pub duration_ms: u32,
}

pub fn log_capture_event(_app: &AppHandle, meta: &CaptureMetadata) {
    if meta.error_class.is_some() {
        log::error!(target: "capture", "Capture failed: {}", serde_json::to_string(meta).unwrap_or_default());
    } else {
        log::info!(target: "capture", "Capture success: {}", serde_json::to_string(meta).unwrap_or_default());
    }
}
