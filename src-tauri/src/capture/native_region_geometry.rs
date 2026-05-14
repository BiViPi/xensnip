use crate::capture::native_region_state::{GlobalRect, HandleId, LocalSelectionRect};
use windows::Win32::Foundation::{LPARAM, RECT};

pub(super) fn get_x_lparam(lparam: LPARAM) -> i32 {
    (lparam.0 as i16) as i32
}

pub(super) fn get_y_lparam(lparam: LPARAM) -> i32 {
    ((lparam.0 >> 16) as i16) as i32
}

// ── Coordinate conversion helpers ─────────────────────────────────────────────

/// Convert a global rect to local (window-relative) coordinates.
pub(super) fn global_to_local_rect(g: GlobalRect, vx: i32, vy: i32) -> LocalSelectionRect {
    crate::capture::native_region_state::local_rect_from_global(g, vx, vy)
}

// ── Handle hit-testing ────────────────────────────────────────────────────────

/// Hit areas (14×14 px) for all 8 resize handles.
pub(super) struct HandleHitRects {
    pub nw: RECT,
    pub n: RECT,
    pub ne: RECT,
    pub w: RECT,
    pub e: RECT,
    pub sw: RECT,
    pub s: RECT,
    pub se: RECT,
}

/// Compute 14×14 px hit rects for all 8 handles from a local selection rect.
pub(super) fn handle_hit_rects(r: LocalSelectionRect) -> HandleHitRects {
    const HR: i32 = 7; // half hit-area size
    let cx = (r.left + r.right) / 2;
    let cy = (r.top + r.bottom) / 2;

    let hit = |cx: i32, cy: i32| -> RECT {
        RECT {
            left: cx - HR,
            top: cy - HR,
            right: cx + HR,
            bottom: cy + HR,
        }
    };

    HandleHitRects {
        nw: hit(r.left, r.top),
        n: hit(cx, r.top),
        ne: hit(r.right, r.top),
        w: hit(r.left, cy),
        e: hit(r.right, cy),
        sw: hit(r.left, r.bottom),
        s: hit(cx, r.bottom),
        se: hit(r.right, r.bottom),
    }
}

/// Returns the `HandleId` whose hit rect contains `(px, py)`, or `None`.
/// Corner handles are tested before edge handles so they take priority.
pub(super) fn hit_test_handle(rects: &HandleHitRects, px: i32, py: i32) -> Option<HandleId> {
    let inside = |r: &RECT| px >= r.left && px < r.right && py >= r.top && py < r.bottom;

    // Corners first — they overlap edge midpoints at small sizes
    if inside(&rects.nw) {
        return Some(HandleId::NW);
    }
    if inside(&rects.ne) {
        return Some(HandleId::NE);
    }
    if inside(&rects.sw) {
        return Some(HandleId::SW);
    }
    if inside(&rects.se) {
        return Some(HandleId::SE);
    }
    if inside(&rects.n) {
        return Some(HandleId::N);
    }
    if inside(&rects.s) {
        return Some(HandleId::S);
    }
    if inside(&rects.w) {
        return Some(HandleId::W);
    }
    if inside(&rects.e) {
        return Some(HandleId::E);
    }
    None
}

/// Returns `true` if `(px, py)` is strictly inside the selection rect
/// (not on any border pixel).
pub(super) fn hit_test_interior(r: LocalSelectionRect, px: i32, py: i32) -> bool {
    px > r.left && px < r.right && py > r.top && py < r.bottom
}

/// Returns `true` if `(px, py)` is inside the given `RECT` (inclusive left/top,
/// exclusive right/bottom).
pub(super) fn rect_contains(r: &RECT, px: i32, py: i32) -> bool {
    px >= r.left && px < r.right && py >= r.top && py < r.bottom
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::capture::native_region_state::LocalSelectionRect;

    #[test]
    fn get_x_lparam_extracts_low_word() {
        let lparam = LPARAM(0x00640032_isize); // high=100, low=50
        assert_eq!(get_x_lparam(lparam), 50);
    }

    #[test]
    fn get_y_lparam_extracts_high_word() {
        let lparam = LPARAM(0x00640032_isize); // high=100, low=50
        assert_eq!(get_y_lparam(lparam), 100);
    }

    #[test]
    fn global_to_local_rect_positive_origin() {
        let g = GlobalRect {
            gx: 500,
            gy: 300,
            gw: 200,
            gh: 150,
        };
        let local = global_to_local_rect(g, 400, 200);
        assert_eq!(local.left, 100);
        assert_eq!(local.top, 100);
        assert_eq!(local.right, 300);
        assert_eq!(local.bottom, 250);
    }

    #[test]
    fn global_to_local_rect_negative_origin() {
        let g = GlobalRect {
            gx: -1800,
            gy: 50,
            gw: 100,
            gh: 80,
        };
        let local = global_to_local_rect(g, -1920, 0);
        assert_eq!(local.left, 120);
        assert_eq!(local.top, 50);
        assert_eq!(local.right, 220);
        assert_eq!(local.bottom, 130);
    }

    #[test]
    fn hit_test_handle_returns_correct_handle_at_corners() {
        let r = LocalSelectionRect {
            left: 100,
            top: 100,
            right: 300,
            bottom: 200,
        };
        let rects = handle_hit_rects(r);
        // NW corner center
        assert_eq!(hit_test_handle(&rects, 100, 100), Some(HandleId::NW));
        // SE corner center
        assert_eq!(hit_test_handle(&rects, 300, 200), Some(HandleId::SE));
        // N edge center
        assert_eq!(hit_test_handle(&rects, 200, 100), Some(HandleId::N));
        // E edge center
        assert_eq!(hit_test_handle(&rects, 300, 150), Some(HandleId::E));
    }

    #[test]
    fn hit_test_handle_returns_none_for_interior() {
        let r = LocalSelectionRect {
            left: 100,
            top: 100,
            right: 300,
            bottom: 200,
        };
        let rects = handle_hit_rects(r);
        assert_eq!(hit_test_handle(&rects, 200, 150), None);
    }

    #[test]
    fn hit_test_interior_returns_true_for_inner_point() {
        let r = LocalSelectionRect {
            left: 100,
            top: 100,
            right: 300,
            bottom: 200,
        };
        assert!(hit_test_interior(r, 200, 150));
        assert!(!hit_test_interior(r, 100, 150)); // on left border
        assert!(!hit_test_interior(r, 50, 150)); // outside
    }

    #[test]
    fn rect_contains_checks_bounds_correctly() {
        let r = RECT {
            left: 10,
            top: 20,
            right: 50,
            bottom: 40,
        };
        assert!(rect_contains(&r, 10, 20)); // top-left inclusive
        assert!(!rect_contains(&r, 50, 30)); // right exclusive
        assert!(!rect_contains(&r, 30, 40)); // bottom exclusive
        assert!(rect_contains(&r, 30, 30));
    }
}
