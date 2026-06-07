# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-06-07

### Added
- Opt-in `Print Screen` capture for the monitor under the mouse pointer, including settings migration to schema version `11`.
- Persistent Quick Access handoff that reuses the editor session and preserves cold-spawn `capture_kind` metadata for the first capture.
- Two-image canvas documents with shared preview/export rendering, per-image selection, move, resize, crop, and undoable second-capture insertion.
- A dedicated manual test checklist and focused automated coverage for multi-image history, active-canvas insertion, and cold-spawn metadata.

### Changed
- Copy, export, and pin flows now render multi-image canvases and selected-image crops through the same canvas-document path used by preview.
- Studio mode now demotes or blocks itself for multi-image documents in `v0.5.0`.
- Session cache eviction now protects multi-image documents from automatic removal when the normal single-image limit is reached.

### Fixed
- Quick Access busy-state gating now uses the session-scoped busy token instead of depending on a soon-to-be-deleted asset id.
- Quick Access cleanup now releases warm-session UI asset refs after close or unexpected destroy.
- Multi-image canvas mutations now record undo history correctly, and document thumbnails refresh from the composed canvas instead of a stale raw image.

## [0.4.0] - 2026-05-20

### Added
- Studio Mode: XenSnip now supports a dedicated 2.5D presentation workspace with Browser Frame and Acrylic Block render paths, user-controlled viewing angles, and curated studio backgrounds.
- Per-screenshot presentation mode: each screenshot can now keep its own `2D` or `2.5D` mode instead of sharing one global session toggle.
- Pin to Screen: the current styled composition can now be opened as an always-on-top floating reference window that supports multiple concurrent pins.
- Active-window capture delay: users can now choose `Off`, `3s`, `5s`, or `10s` before active-window capture fires.
- Annotation presets now persist annotation defaults and can replay placed annotation objects from saved presets.

### Changed
- Copy, export, and pin flows now share the same composition render contract for flat and Studio outputs.
- The settings surface now exposes default presentation mode and capture delay as first-class release features.

### Fixed
- Starting a new capture no longer drops placed annotations from the previously active document before preset/state persistence completes.
- Pin window creation, asset loading, close handling, and drag behavior were hardened for the standalone always-on-top workflow.

## [0.3.0] - 2026-05-14

### Added
- Region Capture Confirmation: Region capture now enters a pre-confirm adjustment phase after the initial drag, with move, resize, confirm, and cancel actions before the editor opens.
- Overlay Renderer Refactor: Replaced the old global-alpha selector overlay with a per-pixel layered renderer, keeping the selected area visually clear while preserving interactive chrome, keyboard confirm/cancel behavior, and safe CTA placement near viewport edges.
- Smart Alignment Assist: Resize-handle drags can now snap toward nearby window edges, window bounds, and divider-like visual boundaries while keeping a manual-first pass-through feel.
- Per-capture Filename Flow: Each capture can now be named from its thumbnail card in Quick Access, and explicit custom names prefer the exact target filename before falling back to numbered suffixes on collision.

## [0.2.1] - 2026-05-12

### Added
- Marquee Multi-Select: You can now click and drag on an empty canvas area using the Select tool to create a selection box that selects multiple annotations at once.
- Destructive Close Warning: New premium modal to guard against accidental loss of unsaved work.

### Fixed
- Window Border Bleed: Improved Active Window capture cleanup by trimming capture edges before editor bootstrap, reducing DWM border bleed artifacts on high-DPI displays.
- UI Polish: Fixed missing tooltips on Sidebar and icon-only editor controls.
- Settings UI: Fixed unstyled browser-default tooltips on Settings window title bar buttons.
- Popover Logic: Improved dismissal on outside click/Escape and persistence while dragging canvas handles.
- Tool Workflow: Drawing tools now remain active for repeated use until explicitly cancelled.
- Steps & Callouts: Refined popover layout and discoverability.
- Visual Feedback: Enhanced selection area visibility for Blur and Pixelate tools.
- Freehand Arrow: Fixed coordinate offset in the real-time drawing preview.
- Marquee Selection: Fixed multi-select hit-testing for mixed annotation sets, including `text`, `numbered`, and other object combinations.
- Annotation Selection UX: Added additive marquee selection with `Ctrl/Cmd`, plus more consistent multi-object bulk actions and selection transforms.
- Sidebar Behavior: Right sidebar feature popovers now close correctly on outside click, matching the bottom toolbar behavior.
- OCR Workflow: `Esc` now cancels the active OCR utility mode instead of forcing users to switch tools manually.
- Preset Manager: Fixed the broken `Manage Presets` modal layout caused by modal style collisions in Quick Access.
- Preset Manager: `Esc` now closes the `Manage Presets` modal.

## [0.2.0] - 2026-05-11

### Added
- Validated DPI scaling support at 100%, 125%, 150%, 175%, and 200% for single-monitor Region and Active Window capture.
- Automated export fidelity matrix covering all Tier 1 annotation types across four composition variants and two output formats. Wired into CI.

### Fixed
- Active Window capture coordinate accuracy on non-100% DPI monitors.
- Removed the non-functional Canvas Size placeholder from the Crop & Canvas sidebar menu.
- OCR first use now shows a loading indicator with download progress while the Tesseract model downloads.
- OCR failures now show the reason in the toolbar chip instead of a generic error label.
- Subsequent OCR requests in the same session skip the loading phase once the worker is ready.
- Redo support via `Ctrl+Y` or `Ctrl+Shift+Z`, with redo stacks preserved per document across document switches.
- Arrow-key nudge now moves selected annotations by 1 px, or 10 px with `Shift`.
- Added a `Shift` guard to `Ctrl+Z` so redo shortcuts do not accidentally trigger undo.
- Beta indicators now appear on Tier 2 sidebar groups: Steps & Callouts, Focus & Polish, and Measure & Extract.
- Promoted `speech_bubble` and `freehand_arrow` to Tier 1 after they passed the export fidelity matrix.
- Formalized Smart Redact AI as a retained hidden Tier 3 feature for future R&D work (see `docs/11-decisions/TDR-004-smart-redact-direction.md`).

### Known Limitations
- Cross-monitor mixed-DPI region capture is not yet validated.

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
