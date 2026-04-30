#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(tag = "code", content = "data")]
pub enum EditorOpenError {
    #[error("asset is no longer available")]
    AssetMissing,
    #[error("editor window failed to spawn: {message}")]
    SpawnFailed { message: String },
    #[error("editor soft limit reached")]
    SoftLimitReached { focused_label: String },
}
