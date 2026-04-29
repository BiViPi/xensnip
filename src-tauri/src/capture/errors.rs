use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub enum CaptureErrorClass {
    Busy,
    InvalidTarget,
    WindowUnavailable,
    ProtectedTarget,
    WgcFailure,
    DwmCaveat,
    SecureDesktop,
    Other,
}

#[derive(Debug, Serialize, Clone)]
pub struct CaptureError {
    pub class: CaptureErrorClass,
    pub code: String,
    pub message: String,
}

impl CaptureError {
    pub fn new(class: CaptureErrorClass, code: &str, message: &str) -> Self {
        Self {
            class,
            code: code.to_string(),
            message: message.to_string(),
        }
    }

    #[allow(non_snake_case)]
    pub fn Busy() -> Self {
        Self::new(
            CaptureErrorClass::Busy,
            "capture_busy",
            "A capture session is already in progress.",
        )
    }

    #[allow(non_snake_case)]
    pub fn WgcFailure() -> Self {
        Self::new(
            CaptureErrorClass::WgcFailure,
            "wgc_failure",
            "Windows Graphics Capture failed.",
        )
    }

    #[allow(non_snake_case)]
    pub fn InvalidTarget() -> Self {
        Self::new(
            CaptureErrorClass::InvalidTarget,
            "invalid_target",
            "Target window or region is invalid.",
        )
    }

    #[allow(non_snake_case)]
    pub fn WindowUnavailable() -> Self {
        Self::new(
            CaptureErrorClass::WindowUnavailable,
            "window_unavailable",
            "Active window could not be found or captured.",
        )
    }
}
