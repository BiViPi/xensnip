use windows::Win32::Foundation::{HWND, LPARAM, RECT};
use windows::Win32::Graphics::Gdi::InvalidateRect;

pub(super) fn get_x_lparam(lparam: LPARAM) -> i32 {
    (lparam.0 as i16) as i32
}

pub(super) fn get_y_lparam(lparam: LPARAM) -> i32 {
    ((lparam.0 >> 16) as i16) as i32
}

pub(super) fn selection_bounds(
    start_x: i32,
    start_y: i32,
    current_x: i32,
    current_y: i32,
) -> Option<RECT> {
    let left = start_x.min(current_x);
    let top = start_y.min(current_y);
    let right = start_x.max(current_x);
    let bottom = start_y.max(current_y);

    if right <= left || bottom <= top {
        return None;
    }

    Some(RECT {
        left: left.saturating_sub(4),
        top: (top - 24).max(0),
        right: right.saturating_add(4),
        bottom: bottom.saturating_add(4),
    })
}

pub(super) fn invalidate_selection_bounds(hwnd: HWND, bounds: Option<RECT>) {
    if let Some(rect) = bounds {
        let _ = unsafe { InvalidateRect(Some(hwnd), Some(&rect), false) };
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn selection_bounds_returns_none_when_start_equals_current() {
        assert!(selection_bounds(10, 10, 10, 10).is_none());
        // Zero-width or zero-height should also be None
        assert!(selection_bounds(10, 10, 10, 20).is_none()); // zero width
        assert!(selection_bounds(10, 10, 20, 10).is_none()); // zero height
    }

    #[test]
    fn selection_bounds_returns_padded_rect() {
        let rect = selection_bounds(10, 50, 100, 200).unwrap();
        // left = min(10,100) - 4 = 6
        assert_eq!(rect.left, 6);
        // right = max(10,100) + 4 = 104
        assert_eq!(rect.right, 104);
        // bottom = max(50,200) + 4 = 204
        assert_eq!(rect.bottom, 204);
    }

    #[test]
    fn selection_bounds_normalizes_reversed_coordinates() {
        // end before start — should still produce a valid rect
        let rect = selection_bounds(100, 200, 10, 50).unwrap();
        assert_eq!(rect.left, 6); // min(100,10) - 4
        assert_eq!(rect.right, 104); // max(100,10) + 4
    }
}
