use std::sync::Mutex;
use crate::capture::errors::CaptureError;

pub mod errors;
pub mod region;
pub mod window;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CaptureIntent {
    None,
    Region,
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

    pub fn start(&self, intent: CaptureIntent) -> Result<CaptureSessionGuard, CaptureError> {
        let mut current = self.intent.lock().unwrap();
        if *current != CaptureIntent::None {
            log::warn!(target: "capture", "Session start rejected: Busy with {:?}", *current);
            return Err(CaptureError::Busy());
        }
        *current = intent.clone();
        log::info!(target: "capture", "Session started: {:?}", intent);
        Ok(CaptureSessionGuard { session: self })
    }

    pub fn finish(&self) {
        let mut current = self.intent.lock().unwrap();
        if *current != CaptureIntent::None {
            log::info!(target: "capture", "Session finished: {:?}", *current);
            *current = CaptureIntent::None;
        }
    }
}
