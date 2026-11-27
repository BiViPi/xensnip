import fs from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_VERSION, APP_VERSION_LABEL } from "../../version";
import { TitleBar } from "../TitleBar";
import { Settings } from "../../settings/Settings";
import type { Settings as SettingsType } from "../../ipc/types";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    isMaximized: vi.fn(async () => false),
    onResized: vi.fn(async () => () => {}),
    minimize: vi.fn(async () => {}),
    maximize: vi.fn(async () => {}),
    unmaximize: vi.fn(async () => {}),
    toggleMaximize: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn(async () => {}),
  listen: vi.fn(async () => () => {}),
}));

const mockSettings: SettingsType = {
  version: 1,
  hotkeys: { region: "Ctrl+Shift+S", active_window: "Ctrl+Alt+W" },
  theme: "dark",
  launch_at_startup: false,
  capture_delay_seconds: 0,
  play_copy_sound: false,
  play_save_sound: false,
  export_folder: "C:\\Screenshots",
  export_format: "PNG",
  capture_all_monitors: true,
  print_screen_capture_enabled: false,
  saved_presets: [],
  last_preset: null,
  default_preset_id: null,
  default_presentation_mode: "flat",
};

vi.mock("../../ipc/index", () => ({
  settingsLoad: vi.fn(async () => mockSettings),
  settingsSave: vi.fn(async (next: SettingsType) => ({ settings: next, warnings: [] })),
  selectExportFolder: vi.fn(async () => null),
  openPrintScreenKeyboardSettings: vi.fn(async () => {}),
}));

afterEach(() => {
  cleanup();
});

describe("App version consistency and UI display", () => {
  it("keeps package.json, tauri.conf.json, and Cargo.toml synced at 0.6.0", () => {
    const repoRoot = path.resolve(__dirname, "../../..");
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf-8")) as { version: string };
    const tauriConf = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "src-tauri/tauri.conf.json"), "utf-8")
    ) as { version: string };
    const cargoToml = fs.readFileSync(path.join(repoRoot, "src-tauri/Cargo.toml"), "utf-8");

    expect(APP_VERSION).toBe("0.6.0");
    expect(APP_VERSION_LABEL).toBe("v0.6.0");
    expect(pkg.version).toBe(APP_VERSION);
    expect(tauriConf.version).toBe(APP_VERSION);
    expect(cargoToml).toContain(`version = "${APP_VERSION}"`);
  });

  it("displays app title and version badge in TitleBar", () => {
    render(<TitleBar title="Xensnip" />);
    expect(screen.getByText("Xensnip")).toBeTruthy();
    expect(screen.getByTestId("titlebar-version").textContent).toBe("v0.6.0");
  });

  it("displays version badge and footer label in Settings", async () => {
    render(<Settings />);
    const badge = await screen.findByTestId("settings-version-badge");
    expect(badge.textContent).toBe("v0.6.0");
    expect(screen.getByText("XenSnip v0.6.0")).toBeTruthy();
    expect(screen.getByTestId("titlebar-version").textContent).toBe("v0.6.0");
  });
});
