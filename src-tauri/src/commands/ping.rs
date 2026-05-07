use tauri::AppHandle;

#[derive(serde::Serialize)]
pub struct PingResponse {
    pub version: String,
    pub name: String,
}

#[tauri::command]
pub fn app_ping() -> PingResponse {
    PingResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
    }
}

#[tauri::command]
pub fn settings_load(app_handle: AppHandle) -> crate::settings::Settings {
    crate::settings::load_or_create_default(&app_handle)
}

#[tauri::command]
pub async fn open_settings_window(app_handle: AppHandle) -> Result<(), String> {
    let app = app_handle.clone();
    let (tx, rx) = std::sync::mpsc::channel();

    app_handle
        .run_on_main_thread(move || {
            let result = crate::open_settings_window(&app).map_err(|e| e.to_string());
            let _ = tx.send(result);
        })
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn_blocking(move || {
        rx.recv().map_err(|e| e.to_string())?
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn perf_log(message: String) {
    log::info!(target: "perf", "[FE] {}", message);
}
