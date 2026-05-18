/// Snap logic for P2 Smart Alignment Assist.
///
/// Owns guide detection (thin-band screen scan), per-drag snap tracker, and
/// pure snap computation for all 8 handle types.
/// No overlay drawing lives here — guide lines flow through `OverlayFrame`.
use crate::capture::native_region_state::{GlobalRect, HandleId};

// ── Constants ─────────────────────────────────────────────────────────────────

const SNAP_THRESHOLD_PX: i32 = 8;
/// Snap releases when the raw edge travels THRESHOLD + 4 px from the guide.
const SNAP_BYPASS_DIST: i32 = SNAP_THRESHOLD_PX + 4; // = 12
/// Screen area scanned around the selection for edge candidates (px each side).
pub(super) const SNAP_MARGIN_PX: i32 = 120;
const SNAP_LUMA_THRESHOLD: u8 = 40;
const SNAP_DENSITY_THRESHOLD: u32 = 3;
const MIN_SNAP_EDGE: i32 = 10; // mirrors MIN_SELECTION_EDGE in native_region_state

// ── Data types ────────────────────────────────────────────────────────────────

/// Detected edge candidates in global virtual-screen coordinates.
#[derive(Debug, Clone, Default)]
pub(super) struct SnapGuides {
    /// Global Y positions of detected horizontal edges.
    pub horizontal: Vec<i32>,
    /// Global X positions of detected vertical edges.
    pub vertical: Vec<i32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum SnapAxis {
    Horizontal,
    Vertical,
}

/// A currently-active snap guide rendered through `OverlayFrame.guide_lines`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct ActiveSnapGuide {
    pub axis: SnapAxis,
    /// Global screen coordinate (Y for horizontal, X for vertical).
    pub screen_coord: i32,
}

/// Per-drag snap state.  Reset at the start of each new handle drag.
#[derive(Debug, Default)]
pub(super) struct DragSnapTracker {
    snapped_h: Option<i32>,
    snapped_v: Option<i32>,
    bypassed_h: Vec<i32>,
    bypassed_v: Vec<i32>,
}

impl DragSnapTracker {
    pub(super) fn reset(&mut self) {
        *self = Self::default();
    }
}

/// Full snap runtime — owned by `SelectorWindowState`, not by `SelectorState`.
#[derive(Debug, Default)]
pub(super) struct SnapRuntimeState {
    pub guides: SnapGuides,
    pub tracker: DragSnapTracker,
    pub active_guides: Vec<ActiveSnapGuide>,
}

impl SnapRuntimeState {
    /// Re-detect edge candidates for `selection` and reset all drag state.
    /// Call when entering Adjusting or after a move drag ends.
    pub(super) fn refresh_guides(&mut self, selection: GlobalRect) {
        self.guides = detect_snap_guides(selection, SNAP_MARGIN_PX).unwrap_or_default();
        self.tracker.reset();
        self.active_guides.clear();
    }

    /// Reset tracker and clear guide lines at the start of a new handle drag.
    pub(super) fn begin_handle_drag(&mut self) {
        self.tracker.reset();
        self.active_guides.clear();
    }

    /// Remove guide lines from rendering (drag ended or move drag active).
    pub(super) fn clear_active(&mut self) {
        self.active_guides.clear();
    }
}

// ── Pure snap logic ────────────────────────────────────────────────────────────

/// Apply snap to a handle-drag raw rect and return `(snapped_rect, active_guides)`.
///
/// `active_guides` is empty when no snap fired.
/// Move drags must never be routed through this function.
pub(super) fn apply_handle_snap(
    raw_rect: GlobalRect,
    which: HandleId,
    guides: &SnapGuides,
    tracker: &mut DragSnapTracker,
) -> (GlobalRect, Vec<ActiveSnapGuide>) {
    let orig_right = raw_rect.gx + raw_rect.gw as i32;
    let orig_bottom = raw_rect.gy + raw_rect.gh as i32;

    let mut gx = raw_rect.gx;
    let mut gy = raw_rect.gy;
    let mut gw = raw_rect.gw as i32;
    let mut gh = raw_rect.gh as i32;

    let mut active: Vec<ActiveSnapGuide> = Vec::new();

    let moves_top = matches!(which, HandleId::N | HandleId::NW | HandleId::NE);
    let moves_bottom = matches!(which, HandleId::S | HandleId::SW | HandleId::SE);
    let moves_left = matches!(which, HandleId::W | HandleId::NW | HandleId::SW);
    let moves_right = matches!(which, HandleId::E | HandleId::NE | HandleId::SE);

    // ── Horizontal snap (top or bottom edge) ─────────────────────────────────
    if moves_top || moves_bottom {
        let raw_edge = if moves_top { raw_rect.gy } else { orig_bottom };
        let (coord, is_snap) = snap_coord(
            raw_edge,
            &guides.horizontal,
            &mut tracker.snapped_h,
            &mut tracker.bypassed_h,
        );
        if is_snap {
            active.push(ActiveSnapGuide {
                axis: SnapAxis::Horizontal,
                screen_coord: coord,
            });
            if moves_top {
                gy = coord.min(orig_bottom - MIN_SNAP_EDGE);
                gh = (orig_bottom - gy).max(MIN_SNAP_EDGE);
            } else {
                gh = (coord - gy).max(MIN_SNAP_EDGE);
            }
        }
    }

    // ── Vertical snap (left or right edge) ───────────────────────────────────
    if moves_left || moves_right {
        let raw_edge = if moves_left { raw_rect.gx } else { orig_right };
        let (coord, is_snap) = snap_coord(
            raw_edge,
            &guides.vertical,
            &mut tracker.snapped_v,
            &mut tracker.bypassed_v,
        );
        if is_snap {
            active.push(ActiveSnapGuide {
                axis: SnapAxis::Vertical,
                screen_coord: coord,
            });
            if moves_left {
                gx = coord.min(orig_right - MIN_SNAP_EDGE);
                gw = (orig_right - gx).max(MIN_SNAP_EDGE);
            } else {
                gw = (coord - gx).max(MIN_SNAP_EDGE);
            }
        }
    }

    let result = GlobalRect {
        gx,
        gy,
        gw: gw.max(MIN_SNAP_EDGE) as u32,
        gh: gh.max(MIN_SNAP_EDGE) as u32,
    };
    (result, active)
}

/// Attempt to snap `raw` to the nearest non-bypassed candidate within the threshold.
///
/// Returns `(final_coord, is_snapped)`.
/// Mutates `snapped` / `bypassed` to track state across successive calls for the same drag.
fn snap_coord(
    raw: i32,
    candidates: &[i32],
    snapped: &mut Option<i32>,
    bypassed: &mut Vec<i32>,
) -> (i32, bool) {
    if let Some(cur) = *snapped {
        if (raw - cur).abs() > SNAP_BYPASS_DIST {
            // User dragged far enough past the guide — bypass it.
            bypassed.push(cur);
            *snapped = None;
        } else {
            return (cur, true);
        }
    }

    let best = candidates
        .iter()
        .filter(|&&c| !bypassed.contains(&c))
        .filter(|&&c| (raw - c).abs() <= SNAP_THRESHOLD_PX)
        .min_by_key(|&&c| (raw - c).abs());

    if let Some(&coord) = best {
        *snapped = Some(coord);
        (coord, true)
    } else {
        (raw, false)
    }
}

// ── Edge detection ─────────────────────────────────────────────────────────────

/// Scan thin bands around `selection` for screen edges.
/// Uses `BitBlt` + DIBSection reads; never `GetPixel` loops.
/// Candidates are in global virtual-screen coordinates.
pub(super) fn detect_snap_guides(
    selection: GlobalRect,
    scan_margin: i32,
) -> Result<SnapGuides, String> {
    unsafe { detect_inner(selection, scan_margin) }
}

unsafe fn detect_inner(sel: GlobalRect, margin: i32) -> Result<SnapGuides, String> {
    use windows::Win32::Graphics::Gdi::{CreateCompatibleDC, DeleteDC, GetDC, ReleaseDC};

    let screen_dc = GetDC(None);
    if screen_dc.0.is_null() {
        return Err("GetDC failed".into());
    }
    let mem_dc = CreateCompatibleDC(Some(screen_dc));
    if mem_dc.0.is_null() {
        ReleaseDC(None, screen_dc);
        return Err("CreateCompatibleDC failed".into());
    }

    let mut h: Vec<i32> = Vec::new(); // horizontal candidates (global Y)
    let mut v: Vec<i32> = Vec::new(); // vertical candidates (global X)

    // Scan bands centered on the current selection edges, not only outside
    // them. This keeps nearby window borders detectable even after the user
    // has already dragged slightly inside the target window.
    let full_w = sel.gw as i32 + 2 * margin;
    let full_h = sel.gh as i32 + 2 * margin;
    let band_x = sel.gx - margin;
    let band_y = sel.gy - margin;
    let band_thickness = (margin * 2).max(2);

    // Top band → horizontal edges near the current top edge.
    scan_h_band(
        screen_dc,
        mem_dc,
        band_x,
        sel.gy - margin,
        full_w,
        band_thickness,
        &mut h,
    );
    // Bottom band → horizontal edges near the current bottom edge.
    scan_h_band(
        screen_dc,
        mem_dc,
        band_x,
        sel.gy + sel.gh as i32 - margin,
        full_w,
        band_thickness,
        &mut h,
    );
    // Left band → vertical edges near the current left edge.
    scan_v_band(
        screen_dc,
        mem_dc,
        sel.gx - margin,
        band_y,
        band_thickness,
        full_h,
        &mut v,
    );
    // Right band → vertical edges near the current right edge.
    scan_v_band(
        screen_dc,
        mem_dc,
        sel.gx + sel.gw as i32 - margin,
        band_y,
        band_thickness,
        full_h,
        &mut v,
    );

    // Real top-level window bounds are high-value snap targets. Pixel scanning
    // still picks up dividers inside content; window frames make border snap
    // behaviour much more reliable.
    append_window_bounds_guides(sel, margin, &mut h, &mut v);

    let _ = DeleteDC(mem_dc);
    ReleaseDC(None, screen_dc);

    dedup_candidates(&mut h);
    dedup_candidates(&mut v);

    Ok(SnapGuides {
        horizontal: h,
        vertical: v,
    })
}

/// Scan a horizontal screen band and find rows with many cross-row luma
/// transitions (= horizontal edges).  Appends global Y positions to `out`.
unsafe fn scan_h_band(
    screen_dc: windows::Win32::Graphics::Gdi::HDC,
    mem_dc: windows::Win32::Graphics::Gdi::HDC,
    gx: i32,
    gy: i32,
    bw: i32,
    bh: i32,
    out: &mut Vec<i32>,
) {
    if bw <= 0 || bh < 2 {
        return;
    }
    let (pixels, hbm, old) = match alloc_band(screen_dc, mem_dc, bw, bh) {
        Some(t) => t,
        None => return,
    };
    use windows::Win32::Graphics::Gdi::{BitBlt, DeleteObject, SelectObject, HGDIOBJ, SRCCOPY};

    let _ = BitBlt(mem_dc, 0, 0, bw, bh, Some(screen_dc), gx, gy, SRCCOPY);

    // DIBSection is top-down: row y → offset y * bw.
    let pixels = std::slice::from_raw_parts(pixels, (bw * bh) as usize);
    for y in 1..(bh as usize) {
        let mut count = 0u32;
        let row_prev = (y - 1) * bw as usize;
        let row_curr = y * bw as usize;
        for x in 0..bw as usize {
            if luma(pixels[row_prev + x]).abs_diff(luma(pixels[row_curr + x])) > SNAP_LUMA_THRESHOLD
            {
                count += 1;
            }
        }
        if count >= SNAP_DENSITY_THRESHOLD {
            out.push(gy + y as i32);
        }
    }

    let _ = SelectObject(mem_dc, old);
    let _ = DeleteObject(HGDIOBJ(hbm.0));
}

/// Scan a vertical screen band and find columns with many cross-column luma
/// transitions (= vertical edges).  Appends global X positions to `out`.
unsafe fn scan_v_band(
    screen_dc: windows::Win32::Graphics::Gdi::HDC,
    mem_dc: windows::Win32::Graphics::Gdi::HDC,
    gx: i32,
    gy: i32,
    bw: i32,
    bh: i32,
    out: &mut Vec<i32>,
) {
    if bw < 2 || bh <= 0 {
        return;
    }
    let (pixels, hbm, old) = match alloc_band(screen_dc, mem_dc, bw, bh) {
        Some(t) => t,
        None => return,
    };
    use windows::Win32::Graphics::Gdi::{BitBlt, DeleteObject, SelectObject, HGDIOBJ, SRCCOPY};

    let _ = BitBlt(mem_dc, 0, 0, bw, bh, Some(screen_dc), gx, gy, SRCCOPY);

    let pixels = std::slice::from_raw_parts(pixels, (bw * bh) as usize);
    for x in 1..(bw as usize) {
        let mut count = 0u32;
        for y in 0..bh as usize {
            let row = y * bw as usize;
            if luma(pixels[row + (x - 1)]).abs_diff(luma(pixels[row + x])) > SNAP_LUMA_THRESHOLD {
                count += 1;
            }
        }
        if count >= SNAP_DENSITY_THRESHOLD {
            out.push(gx + x as i32);
        }
    }

    let _ = SelectObject(mem_dc, old);
    let _ = DeleteObject(HGDIOBJ(hbm.0));
}

/// Create a 32-bit top-down DIBSection, select it into `mem_dc`, and return
/// `(pixel_ptr, bitmap, old_object)`.  Caller must restore old object and
/// delete bitmap after reading pixels.
unsafe fn alloc_band(
    screen_dc: windows::Win32::Graphics::Gdi::HDC,
    mem_dc: windows::Win32::Graphics::Gdi::HDC,
    bw: i32,
    bh: i32,
) -> Option<(
    *const u32,
    windows::Win32::Graphics::Gdi::HBITMAP,
    windows::Win32::Graphics::Gdi::HGDIOBJ,
)> {
    use std::ffi::c_void;
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Graphics::Gdi::{
        CreateDIBSection, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        HGDIOBJ,
    };

    let bmi = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: bw,
            biHeight: -bh, // top-down: row 0 = top of image
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            biSizeImage: 0,
            biXPelsPerMeter: 0,
            biYPelsPerMeter: 0,
            biClrUsed: 0,
            biClrImportant: 0,
        },
        bmiColors: [Default::default()],
    };

    let mut pixel_ptr: *mut c_void = std::ptr::null_mut();
    let hbm = match CreateDIBSection(
        Some(screen_dc),
        &bmi,
        DIB_RGB_COLORS,
        &mut pixel_ptr,
        Some(HANDLE::default()),
        0,
    ) {
        Ok(h) if !h.0.is_null() => h,
        _ => return None,
    };

    if pixel_ptr.is_null() {
        let _ = windows::Win32::Graphics::Gdi::DeleteObject(HGDIOBJ(hbm.0));
        return None;
    }

    let old = SelectObject(mem_dc, HGDIOBJ(hbm.0));
    Some((pixel_ptr as *const u32, hbm, old))
}

/// Simplified ITU-R luma from a 32-bit BGRA pixel (GDI layout: B=byte0, G=byte1, R=byte2).
#[inline]
fn luma(bgra: u32) -> u8 {
    let r = (bgra >> 16) & 0xFF;
    let g = (bgra >> 8) & 0xFF;
    let b = bgra & 0xFF;
    ((77 * r + 150 * g + 29 * b) >> 8).min(255) as u8
}

/// Sort and remove candidates closer than 2 px to each other (keep first).
fn dedup_candidates(v: &mut Vec<i32>) {
    if v.is_empty() {
        return;
    }
    v.sort_unstable();
    let mut result: Vec<i32> = Vec::with_capacity(v.len());
    let mut last: Option<i32> = None;
    for &c in v.iter() {
        if last.is_none_or(|l| (c - l) > 2) {
            result.push(c);
            last = Some(c);
        }
    }
    *v = result;
}

// ── Top-level window bounds candidates ────────────────────────────────────────

unsafe fn append_window_bounds_guides(
    sel: GlobalRect,
    margin: i32,
    horizontal: &mut Vec<i32>,
    vertical: &mut Vec<i32>,
) {
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM, RECT};
    use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_EXTENDED_FRAME_BOUNDS};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetWindowRect, IsIconic, IsWindowVisible,
    };

    struct Collector<'a> {
        sel: GlobalRect,
        margin: i32,
        horizontal: &'a mut Vec<i32>,
        vertical: &'a mut Vec<i32>,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let collector = &mut *(lparam.0 as *mut Collector<'_>);

        if !IsWindowVisible(hwnd).as_bool() || IsIconic(hwnd).as_bool() {
            return BOOL(1);
        }

        let mut class_buf = [0u16; 128];
        let class_len = GetClassNameW(hwnd, &mut class_buf);
        if class_len > 0 {
            let class_name = String::from_utf16_lossy(&class_buf[..class_len as usize]);
            if class_name == "XenSnipNativeRegionSelectorV2"
                || matches!(
                    class_name.as_str(),
                    "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd"
                )
            {
                return BOOL(1);
            }
        }

        let mut rect = RECT::default();
        let hr = DwmGetWindowAttribute(
            hwnd,
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut rect as *mut _ as *mut _,
            std::mem::size_of::<RECT>() as u32,
        );
        let invalid_dwm_rect = rect.right <= rect.left || rect.bottom <= rect.top;
        if hr.is_err() || invalid_dwm_rect {
            if GetWindowRect(hwnd, &mut rect).is_err() {
                return BOOL(1);
            }

            let invalid_fallback_rect = rect.right <= rect.left || rect.bottom <= rect.top;
            if invalid_fallback_rect {
                return BOOL(1);
            }
        }

        let sel_left = collector.sel.gx;
        let sel_top = collector.sel.gy;
        let sel_right = collector.sel.gx + collector.sel.gw as i32;
        let sel_bottom = collector.sel.gy + collector.sel.gh as i32;

        let overlaps_x =
            rect.right > sel_left - collector.margin && rect.left < sel_right + collector.margin;
        if overlaps_x {
            if near_any(rect.top, &[sel_top, sel_bottom], collector.margin) {
                collector.horizontal.push(rect.top);
            }
            if near_any(rect.bottom, &[sel_top, sel_bottom], collector.margin) {
                collector.horizontal.push(rect.bottom);
            }
        }

        let overlaps_y =
            rect.bottom > sel_top - collector.margin && rect.top < sel_bottom + collector.margin;
        if overlaps_y {
            if near_any(rect.left, &[sel_left, sel_right], collector.margin) {
                collector.vertical.push(rect.left);
            }
            if near_any(rect.right, &[sel_left, sel_right], collector.margin) {
                collector.vertical.push(rect.right);
            }
        }

        BOOL(1)
    }

    let mut collector = Collector {
        sel,
        margin,
        horizontal,
        vertical,
    };
    let _ = EnumWindows(
        Some(enum_proc),
        LPARAM((&mut collector as *mut Collector<'_>) as isize),
    );
}

fn near_any(coord: i32, edges: &[i32], threshold: i32) -> bool {
    edges.iter().any(|&edge| (coord - edge).abs() <= threshold)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::capture::native_region_state::GlobalRect;

    fn rect(gx: i32, gy: i32, gw: u32, gh: u32) -> GlobalRect {
        GlobalRect { gx, gy, gw, gh }
    }

    fn guides_h(coords: &[i32]) -> SnapGuides {
        SnapGuides {
            horizontal: coords.to_vec(),
            vertical: vec![],
        }
    }

    fn guides_v(coords: &[i32]) -> SnapGuides {
        SnapGuides {
            horizontal: vec![],
            vertical: coords.to_vec(),
        }
    }

    fn guides_hv(h: &[i32], v: &[i32]) -> SnapGuides {
        SnapGuides {
            horizontal: h.to_vec(),
            vertical: v.to_vec(),
        }
    }

    // ── snap_coord ────────────────────────────────────────────────────────────

    #[test]
    fn snap_coord_snaps_within_threshold() {
        let mut snapped = None;
        let mut bypassed = vec![];
        let (coord, active) = snap_coord(95, &[100], &mut snapped, &mut bypassed);
        assert!(active);
        assert_eq!(coord, 100);
        assert_eq!(snapped, Some(100));
    }

    #[test]
    fn snap_coord_no_snap_outside_threshold() {
        let mut snapped = None;
        let mut bypassed = vec![];
        let (coord, active) = snap_coord(88, &[100], &mut snapped, &mut bypassed);
        assert!(!active, "|88-100|=12 > threshold");
        assert_eq!(coord, 88);
    }

    #[test]
    fn snap_coord_stays_snapped_within_bypass_dist() {
        let mut snapped = Some(100i32);
        let mut bypassed = vec![];
        // |95 - 100| = 5 ≤ SNAP_BYPASS_DIST(12) → still snapped
        let (coord, active) = snap_coord(95, &[100], &mut snapped, &mut bypassed);
        assert!(active);
        assert_eq!(coord, 100);
    }

    #[test]
    fn snap_coord_bypass_releases_when_dragged_past() {
        let mut snapped = Some(100i32);
        let mut bypassed = vec![];
        // |113 - 100| = 13 > 12 → bypass
        let (coord, active) = snap_coord(113, &[100], &mut snapped, &mut bypassed);
        assert!(!active);
        assert_eq!(coord, 113);
        assert_eq!(snapped, None);
        assert!(bypassed.contains(&100));
    }

    #[test]
    fn snap_coord_bypassed_candidate_does_not_re_snap() {
        let mut snapped = None;
        let mut bypassed = vec![100i32];
        let (coord, active) = snap_coord(102, &[100], &mut snapped, &mut bypassed);
        assert!(!active);
        assert_eq!(coord, 102);
    }

    #[test]
    fn snap_coord_picks_nearest_of_two_candidates() {
        let mut snapped = None;
        let mut bypassed = vec![];
        // raw=98: |98-95|=3, |98-100|=2 → nearer is 100
        let (coord, _) = snap_coord(98, &[95, 100], &mut snapped, &mut bypassed);
        assert_eq!(coord, 100);
    }

    #[test]
    fn snap_coord_empty_candidates_returns_raw() {
        let mut snapped = None;
        let mut bypassed = vec![];
        let (coord, active) = snap_coord(50, &[], &mut snapped, &mut bypassed);
        assert!(!active);
        assert_eq!(coord, 50);
    }

    // ── apply_handle_snap ─────────────────────────────────────────────────────

    #[test]
    fn apply_n_handle_snaps_top_edge_horizontal_only() {
        let r = rect(100, 200, 100, 100); // top=200, bottom=300
        let g = guides_h(&[195]); // |200-195|=5 ≤ 8
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::N, &g, &mut t);
        assert_eq!(snapped.gy, 195);
        assert_eq!(snapped.gh, 105); // bottom stays at 300
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].axis, SnapAxis::Horizontal);
        assert_eq!(active[0].screen_coord, 195);
    }

    #[test]
    fn apply_s_handle_snaps_bottom_edge() {
        let r = rect(100, 200, 100, 100); // bottom=300
        let g = guides_h(&[305]); // |300-305|=5 ≤ 8
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::S, &g, &mut t);
        assert_eq!(snapped.gy, 200);
        assert_eq!(snapped.gh, 105); // bottom snapped to 305
        assert!(!active.is_empty());
    }

    #[test]
    fn apply_w_handle_snaps_left_edge_vertical_only() {
        let r = rect(100, 200, 100, 100); // left=100, right=200
        let g = guides_v(&[94]); // |100-94|=6 ≤ 8
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::W, &g, &mut t);
        assert_eq!(snapped.gx, 94);
        assert_eq!(snapped.gw, 106); // right stays at 200
        assert_eq!(active[0].axis, SnapAxis::Vertical);
    }

    #[test]
    fn apply_e_handle_snaps_right_edge_vertical_only() {
        let r = rect(100, 200, 100, 100); // right=200
        let g = guides_v(&[207]); // |200-207|=7 ≤ 8
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::E, &g, &mut t);
        assert_eq!(snapped.gx, 100);
        assert_eq!(snapped.gw, 107);
        assert_eq!(active[0].axis, SnapAxis::Vertical);
    }

    #[test]
    fn apply_nw_handle_snaps_both_axes() {
        let r = rect(100, 200, 100, 100);
        let g = guides_hv(&[195], &[94]);
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::NW, &g, &mut t);
        assert_eq!(snapped.gy, 195);
        assert_eq!(snapped.gx, 94);
        assert_eq!(active.len(), 2);
    }

    #[test]
    fn apply_se_handle_snaps_both_axes() {
        let r = rect(100, 200, 100, 100); // right=200, bottom=300
        let g = guides_hv(&[307], &[206]);
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::SE, &g, &mut t);
        assert_eq!(snapped.gh, 107); // bottom snapped to 307
        assert_eq!(snapped.gw, 106); // right snapped to 206
        assert_eq!(active.len(), 2);
    }

    #[test]
    fn apply_n_handle_no_snap_when_outside_threshold() {
        let r = rect(100, 200, 100, 100);
        let g = guides_h(&[180]); // |200-180|=20 > 8
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::N, &g, &mut t);
        assert_eq!(snapped, r);
        assert!(active.is_empty());
    }

    #[test]
    fn apply_handle_snap_no_candidates_returns_raw_rect() {
        let r = rect(100, 200, 100, 100);
        let g = SnapGuides::default();
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::SE, &g, &mut t);
        assert_eq!(snapped, r);
        assert!(active.is_empty());
    }

    #[test]
    fn apply_n_handle_does_not_snap_vertical_guides() {
        let r = rect(100, 200, 100, 100);
        let g = guides_v(&[105]); // vertical guide should NOT affect N handle
        let mut t = DragSnapTracker::default();
        let (snapped, active) = apply_handle_snap(r, HandleId::N, &g, &mut t);
        assert_eq!(snapped, r);
        assert!(active.is_empty());
    }

    // ── dedup_candidates ──────────────────────────────────────────────────────

    #[test]
    fn dedup_removes_close_entries_keeps_first() {
        let mut v = vec![100, 101, 102, 200];
        dedup_candidates(&mut v);
        assert_eq!(v, vec![100, 200]);
    }

    #[test]
    fn dedup_keeps_entries_3px_apart() {
        let mut v = vec![100, 103];
        dedup_candidates(&mut v);
        assert_eq!(v, vec![100, 103]);
    }

    #[test]
    fn dedup_empty_vec_no_panic() {
        let mut v: Vec<i32> = vec![];
        dedup_candidates(&mut v);
        assert!(v.is_empty());
    }

    #[test]
    fn near_any_matches_only_within_threshold() {
        assert!(near_any(205, &[200, 300], 8));
        assert!(!near_any(209, &[200, 300], 8));
    }
}
