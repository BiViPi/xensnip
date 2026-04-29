use std::sync::Mutex;

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

impl CaptureSession {
    pub fn new() -> Self {
        Self {
            intent: Mutex::new(CaptureIntent::None),
        }
    }

    pub fn start(&self, intent: CaptureIntent) -> Result<(), errors::CaptureError> {
        let mut current = self.intent.lock().unwrap();
        if *current != CaptureIntent::None {
            return Err(errors::CaptureError::Busy());
        }
        *current = intent;
        Ok(())
    }

    pub fn finish(&self) {
        let mut current = self.intent.lock().unwrap();
        *current = CaptureIntent::None;
    }
}
