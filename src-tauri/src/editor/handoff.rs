use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct EditorHandoffResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

pub struct PendingHandoff {
    pub window_label: String,
    pub qa_label: String,
    pub deadline: Instant,
}

pub struct HandoffManager {
    pending: Mutex<HashMap<String, PendingHandoff>>,
}

impl HandoffManager {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
        }
    }

    pub fn add(&self, window_label: String, qa_label: String, timeout: Duration) {
        let mut pending = self.pending.lock().unwrap();
        pending.insert(
            window_label.clone(),
            PendingHandoff {
                window_label,
                qa_label,
                deadline: Instant::now() + timeout,
            },
        );
    }

    pub fn resolve(&self, window_label: &str) -> Option<PendingHandoff> {
        let mut pending = self.pending.lock().unwrap();
        pending.remove(window_label)
    }

    pub fn cleanup_expired(&self) -> Vec<PendingHandoff> {
        let mut pending = self.pending.lock().unwrap();
        let now = Instant::now();
        let mut expired = Vec::new();
        
        pending.retain(|_, v| {
            if v.deadline <= now {
                expired.push(PendingHandoff {
                    window_label: v.window_label.clone(),
                    qa_label: v.qa_label.clone(),
                    deadline: v.deadline,
                });
                false
            } else {
                true
            }
        });
        
        expired
    }
}
