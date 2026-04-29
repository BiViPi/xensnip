import { invoke } from "@tauri-apps/api/core";
import { PingResponse, Settings, CaptureResult, CaptureFailure, RegionConfirmPayload } from "./types";

/**
 * Smoke command: Ping the Rust core
 */
export async function appPing(): Promise<PingResponse> {
  return await invoke<PingResponse>("app_ping");
}

/**
 * Smoke command: Load settings from Rust core
 */
export async function settingsLoad(): Promise<Settings> {
  return await invoke<Settings>("settings_load");
}

// --- Capture commands (Sprint 02 contract) ---

/**
 * Start region capture: acquires session lock and opens the region overlay.
 * The overlay calls capture_region_confirm or capture_cancel when done.
 */
export async function captureStartRegion(): Promise<void> {
  return await invoke<void>("capture_start_region");
}

/**
 * Start active-window capture. Synchronous — capture is done when the promise resolves.
 * Listen to "capture.result" event for the asset_id.
 */
export async function captureStartWindow(): Promise<void> {
  return await invoke<void>("capture_start_window");
}

/**
 * Confirm region selection from the overlay.
 * Coordinates must be physical pixels relative to the target monitor.
 */
export async function captureRegionConfirm(
  payload: RegionConfirmPayload
): Promise<void> {
  return await invoke<void>("capture_region_confirm", {
    x: payload.x,
    y: payload.y,
    w: payload.w,
    h: payload.h,
    monitorId: payload.monitor_id,
  });
}

/**
 * Cancel any in-progress capture. Closes overlay and releases session lock.
 */
export async function captureCancel(): Promise<void> {
  return await invoke<void>("capture_cancel");
}

// Re-export event payload types for consumers.
export type { CaptureResult, CaptureFailure };
