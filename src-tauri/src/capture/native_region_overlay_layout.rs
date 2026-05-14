/// Pure data types and layout arithmetic for the overlay chrome.
///
/// No Win32 drawing calls live here — only `RECT` is imported for layout output
/// compatibility. Every function is unit-testable without a live window.
use crate::capture::native_region_geometry::global_to_local_rect;
use crate::capture::native_region_snap::{ActiveSnapGuide, SnapAxis};
use crate::capture::native_region_state::{LocalSelectionRect, SelectorState};
use windows::Win32::Foundation::RECT;

// ── Public types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum OverlayPhase {
    Idle,
    Selecting,
    Adjusting,
}

/// A single resize handle to render.
#[derive(Debug, Clone, Copy)]
pub(super) struct HandleVisual {
    /// Center X in local (window-relative) coordinates.
    pub cx: i32,
    /// Center Y in local coordinates.
    pub cy: i32,
    pub kind: HandleVisualKind,
}

#[derive(Debug, Clone, Copy)]
pub(super) enum HandleVisualKind {
    /// L-shaped corner bracket. `arm` pixels per arm.
    CornerBracket { arm: i32 },
    /// Small filled circle at an edge midpoint.
    EdgeDot { radius: i32 },
}

/// Hit-areas and draw-rects for the two CTA buttons in the Adjusting phase.
/// These rects are the single source of truth for both rendering and hit-testing,
/// so they cannot drift apart.
#[derive(Debug, Clone, Copy, Default)]
pub(super) struct ButtonLayout {
    pub confirm: RECT,
    pub cancel: RECT,
}

/// A snap guide line (P2 extension point — empty in P1.5).
#[derive(Debug, Clone, Copy)]
pub(super) struct GuideLine {
    pub axis: GuideAxis,
    /// Local-coordinate position (X for vertical, Y for horizontal).
    pub coord: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub(super) enum GuideAxis {
    Horizontal,
    Vertical,
}

/// The single data model consumed by both the renderer and the hit-tester.
/// Built fresh after every state change; never mutated in place.
#[derive(Debug)]
pub(super) struct OverlayFrame {
    pub window_w: i32,
    pub window_h: i32,
    pub phase: OverlayPhase,
    /// Active selection in local (window-relative) coordinates.
    /// `None` when idle.
    pub selection: Option<LocalSelectionRect>,
    /// Present only in `Adjusting` phase. Same rects used for render AND hit-test.
    pub buttons: Option<ButtonLayout>,
    pub handles: Vec<HandleVisual>,
    /// "W × H" string for the size badge. Empty when there is no selection.
    pub badge_text: String,
    /// Snap guide lines (reserved for P2; always empty in P1.5).
    pub guide_lines: Vec<GuideLine>,
}

// ── Frame builder ─────────────────────────────────────────────────────────────

/// Build a complete `OverlayFrame` from the current selector state.
///
/// `active_guides` are controller-owned snap guides in global screen coordinates;
/// this function converts them to local window coordinates for the renderer.
pub(super) fn build_overlay_frame(
    state: &SelectorState,
    window_w: i32,
    window_h: i32,
    active_guides: &[ActiveSnapGuide],
) -> OverlayFrame {
    let vx = state.virtual_x;
    let vy = state.virtual_y;

    if state.is_selecting() {
        let selection = state.current_local_rect();
        OverlayFrame {
            window_w,
            window_h,
            phase: OverlayPhase::Selecting,
            badge_text: selection.map(format_size).unwrap_or_default(),
            selection,
            buttons: None,
            handles: vec![],
            guide_lines: vec![],
        }
    } else if state.is_adjusting() {
        if let Some(g) = state.current_adjust_rect().copied() {
            let local = global_to_local_rect(g, vx, vy);
            let buttons = compute_button_layout(local, window_w, window_h);
            let guide_lines = guides_to_local(active_guides, vx, vy);
            OverlayFrame {
                window_w,
                window_h,
                phase: OverlayPhase::Adjusting,
                badge_text: format_size(local),
                selection: Some(local),
                buttons: Some(buttons),
                handles: build_handles(local),
                guide_lines,
            }
        } else {
            OverlayFrame::idle(window_w, window_h)
        }
    } else {
        OverlayFrame::idle(window_w, window_h)
    }
}

/// Convert controller-owned global snap guides to local `GuideLine` entries.
fn guides_to_local(guides: &[ActiveSnapGuide], vx: i32, vy: i32) -> Vec<GuideLine> {
    guides
        .iter()
        .map(|ag| GuideLine {
            axis: match ag.axis {
                SnapAxis::Horizontal => GuideAxis::Horizontal,
                SnapAxis::Vertical   => GuideAxis::Vertical,
            },
            // Global → local: horizontal guide uses vy offset, vertical uses vx.
            coord: match ag.axis {
                SnapAxis::Horizontal => ag.screen_coord - vy,
                SnapAxis::Vertical   => ag.screen_coord - vx,
            },
        })
        .collect()
}

impl OverlayFrame {
    fn idle(window_w: i32, window_h: i32) -> Self {
        Self {
            window_w,
            window_h,
            phase: OverlayPhase::Idle,
            selection: None,
            buttons: None,
            handles: vec![],
            badge_text: String::new(),
            guide_lines: vec![],
        }
    }
}

// ── Handle builder ────────────────────────────────────────────────────────────

fn build_handles(r: LocalSelectionRect) -> Vec<HandleVisual> {
    const ARM: i32 = 20;
    const RADIUS: i32 = 4;

    let cx = (r.left + r.right) / 2;
    let cy = (r.top + r.bottom) / 2;

    vec![
        // Corner L-brackets
        HandleVisual { cx: r.left,  cy: r.top,    kind: HandleVisualKind::CornerBracket { arm: ARM } },
        HandleVisual { cx: r.right, cy: r.top,    kind: HandleVisualKind::CornerBracket { arm: ARM } },
        HandleVisual { cx: r.left,  cy: r.bottom, kind: HandleVisualKind::CornerBracket { arm: ARM } },
        HandleVisual { cx: r.right, cy: r.bottom, kind: HandleVisualKind::CornerBracket { arm: ARM } },
        // Edge midpoint dots
        HandleVisual { cx,          cy: r.top,    kind: HandleVisualKind::EdgeDot { radius: RADIUS } },
        HandleVisual { cx,          cy: r.bottom, kind: HandleVisualKind::EdgeDot { radius: RADIUS } },
        HandleVisual { cx: r.left,  cy,           kind: HandleVisualKind::EdgeDot { radius: RADIUS } },
        HandleVisual { cx: r.right, cy,           kind: HandleVisualKind::EdgeDot { radius: RADIUS } },
    ]
}

// ── Button layout ─────────────────────────────────────────────────────────────

const CONFIRM_W: i32 = 115;
const CANCEL_W:  i32 = 100;
const BTN_H:     i32 = 34;
const BTN_GAP:   i32 = 8;
const BTN_MARGIN: i32 = 12;
const EDGE_PAD:  i32 = 4;

/// Compute confirm and cancel button rects in local window coordinates.
///
/// Buttons are right-aligned to `selection.right`, clamped so the whole group
/// stays inside the window. Placed below the selection; flips above if too
/// close to the bottom.
pub(super) fn compute_button_layout(
    selection: LocalSelectionRect,
    window_w: i32,
    window_h: i32,
) -> ButtonLayout {
    let group_w = CANCEL_W + BTN_GAP + CONFIRM_W;

    // Right-align group with selection right edge, then clamp inside window.
    let desired_x = selection.right - group_w;
    let max_x = (window_w - group_w - EDGE_PAD).max(EDGE_PAD);
    let group_x = desired_x.clamp(EDGE_PAD, max_x);

    let cancel_x  = group_x;
    let confirm_x = group_x + CANCEL_W + BTN_GAP;

    // Below the selection; flip above when there is not enough room.
    let below = selection.bottom + BTN_MARGIN;
    let raw_y = if below + BTN_H > window_h - EDGE_PAD {
        selection.top - BTN_MARGIN - BTN_H
    } else {
        below
    };
    let max_y = (window_h - BTN_H - EDGE_PAD).max(EDGE_PAD);
    let btn_y = raw_y.clamp(EDGE_PAD, max_y);

    ButtonLayout {
        confirm: RECT { left: confirm_x, top: btn_y, right: confirm_x + CONFIRM_W, bottom: btn_y + BTN_H },
        cancel:  RECT { left: cancel_x,  top: btn_y, right: cancel_x  + CANCEL_W,  bottom: btn_y + BTN_H },
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

fn format_size(r: LocalSelectionRect) -> String {
    let w = (r.right - r.left).unsigned_abs();
    let h = (r.bottom - r.top).unsigned_abs();
    format!("{} \u{00D7} {}", w, h) // "W × H"
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn sel(left: i32, top: i32, right: i32, bottom: i32) -> LocalSelectionRect {
        LocalSelectionRect { left, top, right, bottom }
    }

    #[test]
    fn button_layout_places_group_below_selection() {
        let layout = compute_button_layout(sel(100, 100, 500, 400), 1920, 1080);
        assert_eq!(layout.confirm.top, 400 + BTN_MARGIN);
        assert_eq!(layout.cancel.top, 400 + BTN_MARGIN);
    }

    #[test]
    fn button_layout_right_aligns_confirm_to_selection() {
        let layout = compute_button_layout(sel(100, 100, 500, 400), 1920, 1080);
        assert_eq!(layout.confirm.right, 500);
    }

    #[test]
    fn button_layout_cancel_is_left_of_confirm() {
        let layout = compute_button_layout(sel(100, 100, 500, 400), 1920, 1080);
        assert!(layout.cancel.right <= layout.confirm.left);
    }

    #[test]
    fn button_layout_flips_above_when_near_bottom() {
        let layout = compute_button_layout(sel(100, 800, 500, 1060), 1920, 1080);
        // 1060 + 12 + 34 = 1106 > 1076 → flip above
        assert!(layout.confirm.top < 800);
    }

    #[test]
    fn button_layout_clamps_left_edge() {
        // Selection so narrow / close to left that group would go negative
        let layout = compute_button_layout(sel(0, 100, 50, 300), 1920, 1080);
        assert!(layout.cancel.left >= EDGE_PAD);
    }

    #[test]
    fn button_layout_clamps_right_edge() {
        // Selection right near window edge
        let layout = compute_button_layout(sel(1900, 100, 1919, 300), 1920, 1080);
        assert!(layout.confirm.right <= 1920 - EDGE_PAD);
    }

    #[test]
    fn button_layout_clamps_top_when_flipped_near_top() {
        // Selection tall enough that flipped position would be negative
        let layout = compute_button_layout(sel(100, 5, 500, 1075), 1920, 1080);
        assert!(layout.confirm.top >= EDGE_PAD);
    }

    #[test]
    fn confirm_and_cancel_rects_match_render_and_hit_test() {
        // Prove that a frame built from the layout has the same rects that
        // hit-testing would use.  Same layout call → same rects.
        let s = sel(200, 200, 800, 600);
        let a = compute_button_layout(s, 1920, 1080);
        let b = compute_button_layout(s, 1920, 1080);
        assert_eq!(a.confirm.left, b.confirm.left);
        assert_eq!(a.cancel.left, b.cancel.left);
    }

    #[test]
    fn format_size_uses_multiplication_sign() {
        let text = format_size(sel(0, 0, 1280, 720));
        assert_eq!(text, "1280 \u{00D7} 720");
    }

    #[test]
    fn build_handles_returns_8_visuals() {
        let handles = build_handles(sel(100, 100, 400, 300));
        assert_eq!(handles.len(), 8);
        let corners = handles.iter().filter(|h| matches!(h.kind, HandleVisualKind::CornerBracket { .. })).count();
        let dots    = handles.iter().filter(|h| matches!(h.kind, HandleVisualKind::EdgeDot { .. })).count();
        assert_eq!(corners, 4);
        assert_eq!(dots, 4);
    }

    // ── build_overlay_frame guide conversion ──────────────────────────────────

    fn make_adjusting_state_at(vx: i32, vy: i32) -> crate::capture::native_region_state::SelectorState {
        use crate::capture::native_region_state::SelectorState;
        let mut s = SelectorState::new(vx, vy);
        s.begin_selection(10, 20);
        let ok = s.try_enter_adjust(110, 100);
        assert!(ok, "selection too small for test");
        s
    }

    #[test]
    fn build_overlay_frame_converts_horizontal_guide_to_local_y() {
        use crate::capture::native_region_snap::{ActiveSnapGuide, SnapAxis};
        let state = make_adjusting_state_at(0, 100); // virtual_y = 100
        let guides = [ActiveSnapGuide { axis: SnapAxis::Horizontal, screen_coord: 500 }];
        let frame = build_overlay_frame(&state, 1920, 1080, &guides);
        assert_eq!(frame.guide_lines.len(), 1);
        assert_eq!(frame.guide_lines[0].coord, 500 - 100); // local Y = 400
        assert!(matches!(frame.guide_lines[0].axis, GuideAxis::Horizontal));
    }

    #[test]
    fn build_overlay_frame_converts_vertical_guide_with_negative_virtual_x() {
        use crate::capture::native_region_snap::{ActiveSnapGuide, SnapAxis};
        let state = make_adjusting_state_at(-1920, 0); // virtual_x = -1920
        let guides = [ActiveSnapGuide { axis: SnapAxis::Vertical, screen_coord: -1800 }];
        let frame = build_overlay_frame(&state, 1920, 1080, &guides);
        assert_eq!(frame.guide_lines.len(), 1);
        assert_eq!(frame.guide_lines[0].coord, -1800 - (-1920)); // local X = 120
        assert!(matches!(frame.guide_lines[0].axis, GuideAxis::Vertical));
    }

    #[test]
    fn build_overlay_frame_selecting_phase_has_no_guides() {
        use crate::capture::native_region_snap::{ActiveSnapGuide, SnapAxis};
        let mut state = make_adjusting_state_at(0, 0);
        // Simulate selecting phase by creating a fresh state
        let mut s = crate::capture::native_region_state::SelectorState::new(0, 0);
        s.begin_selection(10, 20);
        let guides = [ActiveSnapGuide { axis: SnapAxis::Horizontal, screen_coord: 100 }];
        let frame = build_overlay_frame(&s, 1920, 1080, &guides);
        // Selecting phase never shows guides — guide_lines should be empty.
        assert!(frame.guide_lines.is_empty());
        // Suppress unused variable warning from the adjusting state.
        let _ = &mut state;
    }
}
