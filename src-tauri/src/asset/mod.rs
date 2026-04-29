use std::collections::HashMap;
use std::sync::{Arc, Mutex};

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

    pub fn get(&self, id: &str) -> Option<Asset> {
        let map = self.assets.lock().unwrap();
        map.get(id).cloned()
    }
}
