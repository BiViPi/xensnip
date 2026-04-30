import { invoke } from "@tauri-apps/api/core";
import {
  PingResponse,
  Settings,
  CaptureResult,
  CaptureFailure,
  RegionConfirmPayload,
  AssetResolveResult,
} from "./types";

// ─── Smoke / settings ─────────────────────────────────────────────────────────

export async function appPing(): Promise<PingResponse> {
  return await invoke<PingResponse>("app_ping");
}

export async function settingsLoad(): Promise<Settings> {
  return await invoke<Settings>("settings_load");
}

// ─── Capture commands (Sprint 02 contract — do not change) ───────────────────

export async function captureStartRegion(): Promise<void> {
  return await invoke<void>("capture_start_region");
}

export async function captureStartWindow(): Promise<void> {
  return await invoke<void>("capture_start_window");
}

export async function captureRegionConfirm(payload: RegionConfirmPayload): Promise<void> {
  return await invoke<void>("capture_region_confirm", {
    x: payload.x,
    y: payload.y,
    w: payload.w,
    h: payload.h,
    monitorId: payload.monitor_id,
  });
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
    pngBytes: Array.from(pngBytes),
  });
}

export async function exportSavePng(
  pngBytes: Uint8Array,
  defaultFilename: string,
): Promise<boolean> {
  return await invoke<boolean>("export_save_png", {
    pngBytes: Array.from(pngBytes),
    defaultFilename,
  });
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

// ─── Re-export event payload types ───────────────────────────────────────────

export type { CaptureResult, CaptureFailure };
export * from "./types";
