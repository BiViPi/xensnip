import { invoke } from "@tauri-apps/api/core";
import { PingResponse, Settings } from "./types";

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
