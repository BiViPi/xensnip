import { invoke } from "@tauri-apps/api/core";
import {
  PingResponse,
  Settings,
  CaptureResult,
  CaptureFailure,
  AssetResolveResult,
  SettingsSaveResult,
  SavedPreset,
} from "./types";
import type { EditorPreset } from "../compose/preset";

// ─── Smoke / settings ─────────────────────────────────────────────────────────

export async function appPing(): Promise<PingResponse> {
  return await invoke<PingResponse>("app_ping");
}

export async function settingsLoad(): Promise<Settings> {
  return await invoke<Settings>("settings_load");
}

export async function settingsSave(settings: Settings): Promise<SettingsSaveResult> {
  return await invoke<SettingsSaveResult>("settings_save", { newSettings: settings });
}

// ─── Capture commands (Sprint 02 contract — do not change) ───────────────────

export async function captureStartRegion(): Promise<void> {
  return await invoke<void>("capture_start_region");
}

export async function captureStartWindow(): Promise<void> {
  return await invoke<void>("capture_start_window");
}

export async function captureCancel(): Promise<void> {
  return await invoke<void>("capture_cancel");
}

// ─── Asset commands (Sprint 03) ───────────────────────────────────────────────

/**
 * Increment ref-count for this consumer and return the xensnip-asset:// URI.
 * Call once per consumer window before reading bytes.
 */
export async function assetResolve(assetId: string, consumer: string): Promise<AssetResolveResult> {
  return await invoke<AssetResolveResult>("asset_resolve", { assetId, consumer });
}

/**
 * Decrement ref-count. When it reaches 0 the registry drops the bytes.
 * Idempotent — safe to call on an already-dropped asset.
 */
export async function assetRelease(assetId: string, consumer: string): Promise<void> {
  return await invoke<void>("asset_release", { assetId, consumer });
}

export async function assetReadPng(assetId: string): Promise<Uint8Array> {
  const pngBytes = await invoke<number[]>("asset_read_png", { assetId });
  return new Uint8Array(pngBytes);
}

export async function clipboardWriteImage(pngBytes: Uint8Array): Promise<void> {
  return await invoke<void>("clipboard_write_image", {
    pngBytes,
  });
}

export async function exportSaveMedia(
  bytes: Uint8Array,
  folderPath: string,
  filename: string,
): Promise<boolean> {
  return await invoke<boolean>("export_save_media", {
    bytes,
    folderPath,
    filename,
  });
}

export async function selectExportFolder(): Promise<string | null> {
  return await invoke<string | null>("select_export_folder");
}

// ─── Editor commands (Sprint 03) ─────────────────────────────────────────────

// ─── Quick Access commands (Sprint 03) ───────────────────────────────────────

/** Dismiss the Quick Access window and release the QA ref-counts. */
export async function quickAccessDismiss(assetId: string): Promise<void> {
  return await invoke<void>("quick_access_dismiss", { assetId });
}

export async function quickAccessSetBusy(assetId: string, busy: boolean): Promise<void> {
  return await invoke<void>("quick_access_set_busy", { assetId, busy });
}

export async function quickAccessMarkReady(): Promise<void> {
  return await invoke<void>("quick_access_mark_ready");
}

export async function presetSave(savedPreset: SavedPreset): Promise<void> {
  return await invoke<void>("preset_save", { savedPreset });
}

export async function presetDelete(presetId: string): Promise<void> {
  return await invoke<void>("preset_delete", { presetId });
}

export async function presetRename(presetId: string, newName: string): Promise<void> {
  return await invoke<void>("preset_rename", { presetId, newName });
}

export async function presetDuplicate(presetId: string): Promise<void> {
  return await invoke<void>("preset_duplicate", { presetId });
}

export async function presetReorder(presetIds: string[]): Promise<void> {
  return await invoke<void>("preset_reorder", { presetIds });
}

export async function presetSetDefault(presetId: string | null): Promise<void> {
  return await invoke<void>("preset_set_default", { presetId });
}

export async function presetExportPack(presetIds: string[]): Promise<boolean> {
  return await invoke<boolean>("preset_export_pack", { presetIds });
}

export async function presetImport(): Promise<number> {
  return await invoke<number>("preset_import");
}

export async function openSettingsWindow(): Promise<void> {
  return invoke("open_settings_window");
}

export async function settingsUpdateLastPreset(preset: EditorPreset): Promise<void> {
  return await invoke<void>("settings_update_last_preset", { preset });
}

export async function perfLog(message: string): Promise<void> {
  return await invoke<void>("perf_log", { message });
}

// ─── Re-export event payload types ───────────────────────────────────────────

export type { CaptureResult, CaptureFailure };
export * from "./types";
