// ─── Sprint 00 / settings types ───────────────────────────────────────────────

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

// ─── Sprint 02: Capture IPC contract ─────────────────────────────────────────

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

// ─── Sprint 03: Asset registry ────────────────────────────────────────────────

/** Returned by asset_resolve — the URI frontend uses to load the asset. */
export interface AssetResolveResult {
  uri: string;
}

export interface AssetError {
  code: string;
  message: string;
}

// ─── Sprint 03: Quick Access positioning ─────────────────────────────────────

export interface MonitorWorkAreaLogical {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CaptureRectLogical {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CapturePositionMeta {
  monitor_work_area_logical: MonitorWorkAreaLogical;
  monitor_dpi: number;
  capture_kind: string;
  capture_rect_logical: CaptureRectLogical | null;
}

/** Payload of the "quick-access-show" event */
export interface QuickAccessShowPayload {
  asset_id: string;
  capture_meta: CapturePositionMeta;
}

/** Payload of the "editor.count_changed" event */
export interface EditorCountChangedPayload {
  open_count: number;
}

// ─── Sprint 04: Editor types ──────────────────────────────────────────────────

export type EditorOpenError =
  | { code: "SpawnFailed"; data: { message: string } }
  | { code: "SoftLimitReached"; data: { focused_label: string } };

export interface EditorOpenResult {
  window_label: string;
  asset_uri: string;
}
