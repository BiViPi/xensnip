use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

pub struct EditorRegistry {
    // label -> last_focused_at
    entries: Mutex<HashMap<String, Instant>>,
}

impl EditorRegistry {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    pub fn add(&self, label: String) {
        let mut entries = self.entries.lock().unwrap();
        entries.insert(label, Instant::now());
    }

    pub fn remove(&self, label: &str) {
        let mut entries = self.entries.lock().unwrap();
        entries.remove(label);
    }

    pub fn update_focus(&self, label: &str) {
        let mut entries = self.entries.lock().unwrap();
        if entries.contains_key(label) {
            entries.insert(label.to_string(), Instant::now());
        }
    }

    pub fn count(&self) -> usize {
        let entries = self.entries.lock().unwrap();
        entries.len()
    }

    pub fn get_most_recent_label(&self) -> Option<String> {
        let entries = self.entries.lock().unwrap();
        entries
            .iter()
            .max_by_key(|&(_, &instant)| instant)
            .map(|(label, _)| label.clone())
    }

    pub fn get_labels(&self) -> Vec<String> {
        let entries = self.entries.lock().unwrap();
        entries.keys().cloned().collect()
    }
}
