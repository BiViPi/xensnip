export interface Hotkeys {
  region: string;
  active_window: string;
}

export interface Settings {
  version: number;
  hotkeys: Hotkeys;
  launch_at_startup: boolean;
}

export interface PingResponse {
  version: string;
  name: string;
}

// --- Capture IPC contract (Sprint 02) ---

/** Emitted by Rust on successful capture (event: "capture.result") */
export interface CaptureResult {
  asset_id: string;
}

/** Emitted by Rust on failure (event: "capture.failure") */
export interface CaptureFailure {
  class: string;
  code: string;
  message: string;
}

/** Payload for capture_region_confirm */
export interface RegionConfirmPayload {
  x: number;
  y: number;
  w: number;
  h: number;
  monitor_id: string;
}

