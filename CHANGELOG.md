# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-05-08

### Added
- Preset management actions for saving, renaming, duplicating, deleting, importing, exporting, and setting a default preset from the editor toolbar.

### Fixed
- Restored styled `Background` popover controls after the toolbar refactor so tabs, swatches, and the gradient dial render correctly again.
- Fixed the `Radius/Border` popover border-color swatches and divider styling.
- Rebuilt the `Presets` popover styling to resolve post-refactor layout regressions in both light and dark themes.
- Refined dark-theme preset surfaces and action button treatments to match the rest of the quick-access editor.

## [0.1.0] - 2026-05-07

### Added
- Core capture engine with multi-monitor support.
- Comprehensive annotation toolkit (14 tools): Arrow, Rectangle, Text, Blur, Numbered Steps, Spotlight, Magnify, Simplify UI, Pixel Ruler, Speech Bubble, Callout, Freehand Arrow, Pixelate, Opaque Redact.
- Privacy tooling: Blur, Pixelate, Opaque Redact, and OCR extraction.
- Editor Preset Manager with customizable styling (Glow, Rim, Glass, etc.).
- Composition engine for high-fidelity export and clipboard copy.
- Screenshot document lifecycle management with LRU caching.

### Fixed (Round 1 Refactor)
- **Architecture**: Decoupled `QuickAccess` into modular component trees.
- **Security**: Hardened Tauri CSP and IPC validation.
- **Reliability**: Fixed session mutation bugs and event listener leaks.
- **Performance**: Cleaned up excessive debug logging and implemented asset compression.
- **Code Quality**: Established `tsc --noEmit` baseline and initial unit test suite.

### Known Limitations
- OCR requires CDN connectivity on the first session use to download Tesseract.js workers.
- Win32 native region selector (GDI) is in beta.
