# XenSnip

[![CI](https://github.com/BiViPi/xensnip/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/BiViPi/xensnip/actions/workflows/ci.yml)

Screenshot capture and beautification tool for Windows. Capture any region or window, annotate with shapes and text, apply preset backgrounds and shadows, redact sensitive content, and export or copy to clipboard — all from a system tray interface.

## Features

- Region and window capture via configurable hotkeys
- Annotation tools: shapes, text, arrows, highlight, blur, redact
- Background presets: gradients, solid colors, wallpapers
- Shadow and border controls
- Privacy redaction (SmartRedact)
- OCR text extraction from screen regions
- Quick-access tray interface with session history

## Requirements

- Windows 10 (build 19041+) or Windows 11
- WebView2 runtime — ships pre-installed on Windows 11; auto-installed by the Tauri bundle on Windows 10

## Default Hotkeys

| Action | Shortcut |
|--------|----------|
| Region capture | `Ctrl+Shift+S` |
| Window capture | `Ctrl+Alt+W` |

Both hotkeys are configurable in the Settings dialog.

## Build

**Prerequisites:**

- Rust stable 1.77+
- Node.js 20+
- Tauri CLI: `npm install -g @tauri-apps/cli`

**Development:**

```
npm install
npm run tauri dev
```

**Release build:**

```
npm run tauri build
```

## Development Checks

Run these before merging editor, capture, or session-management changes:

```bash
npm test
npm run build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm audit --omit=dev --audit-level=high
```

## Smoke Test Checklist

Use this short manual pass after refactors that touch capture or annotation flows:

- Native region selector: open overlay, cancel with `Esc`, reject a tiny region, confirm a normal region
- Annotation tools: verify at least one regular drag tool and one text/immediate tool still create objects correctly
- Utility modes: verify OCR selection and Smart Redact selection complete their selection flow without errors
- Quick Access: confirm a fresh capture still opens the tray/editor surface and can be dismissed cleanly

## Project Structure

```
src/                        Frontend (React + TypeScript)
  annotate/                 Annotation tools and state
  compose/                  Background presets and canvas composition
  editor/                   Main editor stage and layout
  measure/                  OCR and coordinate utilities
  privacy/                  SmartRedact redaction tools
  quick-access/             Tray window and session management
  settings/                 Settings dialog and IPC
  sidebar/                  Left and right panel UI

src-tauri/src/              Backend (Rust + Tauri)
  asset.rs                  In-memory PNG asset registry
  capture.rs                Screen capture implementation
  commands/                 Tauri command handlers by domain
  hotkeys.rs                Global shortcut registration
  quick_access.rs           Quick-access window management
  settings.rs               Settings persistence
```

## Settings Location

- Settings file: `%APPDATA%\XenSnip\settings.json`
- Log files: `%APPDATA%\XenSnip\logs\`

## OCR Note

OCR text extraction requires an internet connection on first use per session. The recognition model is downloaded from jsDelivr (`cdn.jsdelivr.net`) on the first OCR call. Subsequent calls within the same session reuse the cached worker and are fast.

## Privacy

- **OCR**: When you use "Extract Text" or "Smart Redact", XenSnip sends a portion of your screenshot to a local in-process OCR engine (Tesseract.js). On first use each session, the OCR engine model is downloaded from `cdn.jsdelivr.net`. The image data is not sent to any remote server — processing happens entirely in the browser process.
- **SmartRedact**: Candidate detection runs locally using the same OCR engine. No screenshot content is transmitted externally.
- **Capture**: Screenshots are held in memory only. They are written to disk only when you explicitly export or save them.
- **Settings**: Stored locally at `%APPDATA%\XenSnip\settings.json`. No telemetry or analytics are collected.

## Troubleshooting

**OCR / Smart Redact shows an error**

The OCR engine requires an internet connection on first use to download model files from `cdn.jsdelivr.net`. If you are behind a corporate proxy or firewall that blocks this CDN, OCR will fail. The error message will indicate a network failure. Once the model is cached for the session, no further network access is needed.

**Hotkeys not triggering capture**

1. Open Settings and verify the hotkey assignments.
2. Some applications (games, certain admin-elevated windows) block global hotkeys. Try capturing from the tray menu instead.
3. If hotkeys conflict with another application, change them in Settings.

**Region selector does not appear**

- Ensure XenSnip is running (check the system tray).
- On multi-monitor setups, the overlay covers all monitors by default. If "Capture all monitors" is disabled in Settings, the overlay only appears on the primary monitor.

**Quick-access window does not open after capture**

- The window appears near the capture area. On high-DPI displays it may appear at a different position. Try clicking the tray icon to bring it to focus.

## Known Limitations

- **Protected windows**: Capture of DRM-protected video players (e.g., Netflix in a browser), certain game overlays, and admin-elevated windows may produce a black or empty capture. This is a Windows security restriction.
- **OCR accuracy**: OCR quality depends on font size, contrast, and language. Non-Latin scripts are not supported in the default model.
- **Region selector on Wayland**: XenSnip is Windows-only and does not support Wayland.
- **WebView2**: The app requires the WebView2 runtime. On Windows 10, it will be bundled in the installer. If it fails to install, download it from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/).

## Reset / Uninstall

**Reset settings to defaults:**

Delete or rename `%APPDATA%\XenSnip\settings.json`. XenSnip will recreate it with default values on next launch.

**Full uninstall:**

1. Uninstall XenSnip via Windows Settings → Apps.
2. Delete `%APPDATA%\XenSnip\` to remove settings and log files.
