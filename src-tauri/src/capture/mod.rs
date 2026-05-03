use crate::capture::errors::CaptureError;
use std::sync::Mutex;

pub mod errors;
pub mod native_region_spike;
pub mod region;
pub mod window;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CaptureIntent {
    None,
    Region,
    RegionConfirming,
    ActiveWindow,
}

pub struct CaptureSession {
    pub intent: Mutex<CaptureIntent>,
}

pub struct CaptureSessionGuard<'a> {
    session: &'a CaptureSession,
}

impl<'a> Drop for CaptureSessionGuard<'a> {
    fn drop(&mut self) {
        self.session.finish();
    }
}

impl CaptureSession {
    pub fn new() -> Self {
        Self {
            intent: Mutex::new(CaptureIntent::None),
        }
    }

    fn begin(&self, intent: CaptureIntent) -> Result<(), CaptureError> {
        let mut current = self.intent.lock().unwrap();
        if *current != CaptureIntent::None {
            log::warn!(target: "capture", "Session start rejected: Busy with {:?}", *current);
            return Err(CaptureError::Busy());
        }
        *current = intent.clone();
        log::info!(target: "capture", "Session started: {:?}", intent);
        Ok(())
    }

    pub fn start(&self, intent: CaptureIntent) -> Result<CaptureSessionGuard<'_>, CaptureError> {
        self.begin(intent)?;
        Ok(CaptureSessionGuard { session: self })
    }

    pub fn start_persistent(&self, intent: CaptureIntent) -> Result<(), CaptureError> {
        self.begin(intent)
    }

    pub fn finish(&self) {
        let mut current = self.intent.lock().unwrap();
        if *current != CaptureIntent::None {
            log::info!(target: "capture", "Session finished: {:?}", *current);
            *current = CaptureIntent::None;
        }
    }
}
