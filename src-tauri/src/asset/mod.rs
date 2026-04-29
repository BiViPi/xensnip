use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[allow(dead_code)] // Sprint 02 only emits assets; consumer reads start in Sprint 03.
#[derive(Debug, Clone)]
pub struct Asset {
    pub id: String,
    // Pixel data or reference to it
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

pub struct AssetRegistry {
    pub assets: Arc<Mutex<HashMap<String, Asset>>>,
}

impl Default for AssetRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl AssetRegistry {
    pub fn new() -> Self {
        Self {
            assets: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn insert(&self, asset: Asset) {
        let mut map = self.assets.lock().unwrap();
        map.insert(asset.id.clone(), asset);
    }
}
