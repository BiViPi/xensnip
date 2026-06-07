use crate::capture::errors::CaptureError;
use std::sync::Mutex;

pub(crate) mod dpi;
pub mod errors;
pub mod fullscreen;
mod gdi_pixels;
pub(crate) mod native_region_active;
mod native_region_geometry;
mod native_region_overlay_layout;
mod native_region_overlay_renderer;
pub mod native_region_selector;
mod native_region_selector_controller;
mod native_region_snap;
mod native_region_state;
pub mod region;
pub mod window;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CaptureIntent {
    None,
    Region,
    RegionConfirming,
    ActiveWindow,
    CurrentMonitor,
}

pub struct DelayedCaptureToken {
    pub intent: CaptureIntent,
    pub scheduled_at: std::time::Instant,
    pub delay: std::time::Duration,
    pub cancel_flag: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

pub struct CaptureSession {
    pub intent: Mutex<CaptureIntent>,
    pub pending_delayed: Mutex<Option<DelayedCaptureToken>>,
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
            pending_delayed: Mutex::new(None),
        }
    }

    pub fn start_delayed(
        &self,
        intent: CaptureIntent,
        delay: std::time::Duration,
    ) -> Result<std::sync::Arc<std::sync::atomic::AtomicBool>, CaptureError> {
        if delay.as_secs() == 0 {
            return Err(CaptureError::Other("Delay cannot be zero"));
        }
        {
            let current = self.intent.lock().unwrap();
            if *current != CaptureIntent::None {
                log::warn!(target: "capture", "Delayed capture start rejected: Busy with {:?}", *current);
                return Err(CaptureError::Busy());
            }
        }
        let mut pending = self.pending_delayed.lock().unwrap();
        if pending.is_some() {
            log::warn!(target: "capture", "Delayed capture start rejected: Another delayed capture is already pending");
            return Err(CaptureError::Busy());
        }

        let cancel_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        *pending = Some(DelayedCaptureToken {
            intent: intent.clone(),
            scheduled_at: std::time::Instant::now(),
            delay,
            cancel_flag: cancel_flag.clone(),
        });
        log::info!(target: "capture", "Delayed capture scheduled: {:?} in {:?}", intent, delay);
        Ok(cancel_flag)
    }

    pub fn cancel_pending_delayed(&self) -> bool {
        let mut pending = self.pending_delayed.lock().unwrap();
        if let Some(token) = pending.take() {
            token
                .cancel_flag
                .store(true, std::sync::atomic::Ordering::SeqCst);
            log::info!(target: "capture", "Pending delayed capture cancelled");
            true
        } else {
            false
        }
    }

    pub fn consume_pending_delayed(&self) -> Option<DelayedCaptureToken> {
        let mut pending = self.pending_delayed.lock().unwrap();
        match pending.take() {
            Some(token) if !token.cancel_flag.load(std::sync::atomic::Ordering::SeqCst) => {
                Some(token)
            }
            _ => None,
        }
    }

    fn begin(&self, intent: CaptureIntent) -> Result<(), CaptureError> {
        let mut current = self.intent.lock().unwrap();
        if *current != CaptureIntent::None {
            log::warn!(target: "capture", "Session start rejected: Busy with {:?}", *current);
            return Err(CaptureError::Busy());
        }
        if self.pending_delayed.lock().unwrap().is_some() {
            log::warn!(target: "capture", "Session start rejected: Delayed capture pending");
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::Ordering;
    use std::time::Duration;

    #[test]
    fn delayed_capture_rejects_zero_delay() {
        let session = CaptureSession::new();
        let result = session.start_delayed(CaptureIntent::ActiveWindow, Duration::from_secs(0));

        assert!(result.is_err());
    }

    #[test]
    fn delayed_capture_rejects_second_pending_request() {
        let session = CaptureSession::new();
        session
            .start_delayed(CaptureIntent::ActiveWindow, Duration::from_secs(3))
            .unwrap();

        let result = session.start_delayed(CaptureIntent::ActiveWindow, Duration::from_secs(3));

        assert!(result.is_err());
    }

    #[test]
    fn cancel_pending_delayed_clears_token_and_sets_cancel_flag() {
        let session = CaptureSession::new();
        let cancel_flag = session
            .start_delayed(CaptureIntent::ActiveWindow, Duration::from_secs(3))
            .unwrap();

        assert!(session.cancel_pending_delayed());
        assert!(cancel_flag.load(Ordering::SeqCst));
        assert!(session.consume_pending_delayed().is_none());
    }

    #[test]
    fn immediate_capture_rejects_while_delay_is_pending() {
        let session = CaptureSession::new();
        session
            .start_delayed(CaptureIntent::ActiveWindow, Duration::from_secs(3))
            .unwrap();

        let result = session.start(CaptureIntent::ActiveWindow);

        assert!(result.is_err());
    }

    #[test]
    fn delayed_capture_rejects_while_immediate_capture_is_active() {
        let session = CaptureSession::new();
        let _guard = session.start(CaptureIntent::ActiveWindow).unwrap();

        let result = session.start_delayed(CaptureIntent::ActiveWindow, Duration::from_secs(3));

        assert!(result.is_err());
    }
}
