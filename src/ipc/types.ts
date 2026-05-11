import type { EditorPreset } from "../compose/preset";

export interface Hotkeys {
  region: string;
  active_window: string;
}

export type ThemeMode = 'dark' | 'light';

export interface Settings {
  version: number;
  hotkeys: Hotkeys;
  theme: ThemeMode;
  launch_at_startup: boolean;
  play_copy_sound: boolean;
  play_save_sound: boolean;
  export_folder: string | null;
  export_format: string;
  capture_all_monitors: boolean;
  saved_presets: SavedPreset[];
  last_preset: EditorPreset | null;
  default_preset_id: string | null;
}

export interface SavedPreset {
  id: string;
  name: string;
  preset: EditorPreset;
  updated_at: string;
}

export interface PresetImportResult {
  imported: number;
  skipped: number;
}

export interface PingResponse {
  version: string;
  name: string;
}

// Capture IPC contract

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

// Asset registry

/** Returned by asset_resolve — the URI frontend uses to load the asset. */
export interface AssetResolveResult {
  uri: string;
}

export interface AssetError {
  code: string;
  message: string;
}

// Quick Access positioning

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
  /** DPI as a percentage of 96 DPI (e.g. 150 for 150% scaling). Never raw DPI. */
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

export type SettingsSaveError =
  | { code: "InvalidHotkey"; data: { field: string; value: string } }
  | { code: "WriteError"; data: { message: string } };

export interface HotkeyWarning {
  field: string;
  shortcut: string;
}

export interface SettingsSaveResult {
  warnings: HotkeyWarning[];
}
