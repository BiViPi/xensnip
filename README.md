# XenSnip

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
