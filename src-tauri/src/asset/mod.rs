use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct Asset {
    pub id: String,
    pub data: Arc<Vec<u8>>,
    pub width: u32,
    pub height: u32,
    pub ref_count: u32,
    pub consumers: HashSet<String>,
}

impl Asset {
    pub fn new(id: String, data: Arc<Vec<u8>>, width: u32, height: u32) -> Self {
        Self {
            id,
            data,
            width,
            height,
            ref_count: 0,
            consumers: HashSet::new(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct AssetResolveResult {
    pub uri: String,
}

#[derive(Debug, Serialize)]
pub struct AssetError {
    pub code: String,
    pub message: String,
}

impl std::fmt::Display for AssetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

#[derive(Clone)]
pub struct AssetRegistry {
    inner: Arc<Mutex<HashMap<String, Asset>>>,
}

impl Default for AssetRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl AssetRegistry {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn insert(&self, asset: Asset) {
        let id = asset.id.clone();
        let mut map = self.inner.lock().unwrap();
        let mut consumers = asset.consumers;
        consumers.insert("capture_engine".to_string());
        let entry = Asset {
            ref_count: consumers.len() as u32,
            consumers,
            ..asset
        };
        map.insert(id.clone(), entry);
        log::info!(
            target: "asset",
            r#"{{"event":"asset.created","asset_id":"{}","ref_count":1,"consumer":"capture_engine"}}"#,
            id
        );
    }

    pub fn resolve(
        &self,
        asset_id: &str,
        consumer: &str,
    ) -> Result<AssetResolveResult, AssetError> {
        self.acquire(asset_id, consumer)?;
        Ok(AssetResolveResult {
            uri: format!("xensnip-asset://localhost/{}", asset_id),
        })
    }

    pub fn resolve_internal(&self, asset_id: &str, consumer: &str) -> Result<(), AssetError> {
        self.acquire(asset_id, consumer)
    }

    pub fn release(&self, asset_id: &str, consumer: &str) -> Result<(), AssetError> {
        let mut map = self.inner.lock().unwrap();
        match map.get_mut(asset_id) {
            Some(asset) => {
                if !asset.consumers.remove(consumer) {
                    log::warn!(
                        target: "asset",
                        r#"{{"event":"asset.release_noop","asset_id":"{}","consumer":"{}","note":"consumer_not_held"}}"#,
                        asset_id,
                        consumer
                    );
                    return Ok(());
                }

                asset.ref_count = asset.consumers.len() as u32;
                let rc = asset.ref_count;
                log::info!(
                    target: "asset",
                    r#"{{"event":"asset.released","asset_id":"{}","ref_count":{},"consumer":"{}"}}"#,
                    asset_id,
                    rc,
                    consumer
                );

                if rc == 0 {
                    map.remove(asset_id);
                    log::info!(
                        target: "asset",
                        r#"{{"event":"asset.dropped","asset_id":"{}","ref_count":0,"consumer":"{}"}}"#,
                        asset_id,
                        consumer
                    );
                }
                Ok(())
            }
            None => {
                log::warn!(
                    target: "asset",
                    r#"{{"event":"asset.release_noop","asset_id":"{}","consumer":"{}","note":"not_found"}}"#,
                    asset_id,
                    consumer
                );
                Ok(())
            }
        }
    }

    pub fn get_data(&self, asset_id: &str) -> Option<Arc<Vec<u8>>> {
        let map = self.inner.lock().unwrap();
        map.get(asset_id).map(|asset| asset.data.clone())
    }

    fn acquire(&self, asset_id: &str, consumer: &str) -> Result<(), AssetError> {
        let mut map = self.inner.lock().unwrap();
        match map.get_mut(asset_id) {
            Some(asset) => {
                if !asset.consumers.insert(consumer.to_string()) {
                    log::info!(
                        target: "asset",
                        r#"{{"event":"asset.acquire_noop","asset_id":"{}","ref_count":{},"consumer":"{}"}}"#,
                        asset_id,
                        asset.ref_count,
                        consumer
                    );
                    return Ok(());
                }

                asset.ref_count = asset.consumers.len() as u32;
                log::info!(
                    target: "asset",
                    r#"{{"event":"asset.acquired","asset_id":"{}","ref_count":{},"consumer":"{}"}}"#,
                    asset_id,
                    asset.ref_count,
                    consumer
                );
                Ok(())
            }
            None => Err(AssetError {
                code: "asset_missing".into(),
                message: "Asset not found or already dropped.".into(),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_asset(id: &str) -> Asset {
        Asset::new(id.into(), std::sync::Arc::new(vec![0u8; 4]), 1, 1)
    }

    #[test]
    fn insert_sets_ref_count_to_one() {
        let registry = AssetRegistry::new();
        registry.insert(make_asset("a1"));
        let map = registry.inner.lock().unwrap();
        assert_eq!(map["a1"].ref_count, 1);
    }

    #[test]
    fn resolve_increments_ref_count() {
        let registry = AssetRegistry::new();
        registry.insert(make_asset("a1"));
        let result = registry.resolve("a1", "qa_ui").unwrap();
        let map = registry.inner.lock().unwrap();
        assert_eq!(map["a1"].ref_count, 2);
        assert_eq!(result.uri, "xensnip-asset://localhost/a1");
    }

    #[test]
    fn resolve_same_consumer_is_noop() {
        let registry = AssetRegistry::new();
        registry.insert(make_asset("a1"));
        registry.resolve("a1", "qa_ui").unwrap();
        registry.resolve("a1", "qa_ui").unwrap();
        let map = registry.inner.lock().unwrap();
        assert_eq!(map["a1"].ref_count, 2);
    }

    #[test]
    fn release_decrements_and_drops_at_zero() {
        let registry = AssetRegistry::new();
        registry.insert(make_asset("a1"));
        registry.resolve("a1", "qa_ui").unwrap();
        registry.release("a1", "qa_ui").unwrap();
        registry.release("a1", "capture_engine").unwrap();
        assert!(registry.get_data("a1").is_none());
    }

    #[test]
    fn release_on_dropped_asset_is_noop() {
        let registry = AssetRegistry::new();
        registry.insert(make_asset("a1"));
        registry.release("a1", "capture_engine").unwrap();
        assert!(registry.release("a1", "qa_ui").is_ok());
    }

    #[test]
    fn resolve_missing_asset_returns_error() {
        let registry = AssetRegistry::new();
        let err = registry.resolve("nonexistent", "qa_ui").unwrap_err();
        assert_eq!(err.code, "asset_missing");
    }
}
