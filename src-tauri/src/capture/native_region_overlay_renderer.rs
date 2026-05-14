/// Per-pixel alpha overlay renderer.
///
/// Renders an `OverlayFrame` onto a layered Win32 window via `UpdateLayeredWindow`,
/// replacing the old global-alpha `SetLayeredWindowAttributes` approach.
///
/// # Rendering pipeline
///
/// 1. Create a 32-bit BGRA DIBSection backed by GDI memory.
/// 2. Fill the entire surface with a dim marker colour (GDI FillRect).
/// 3. Fill the active selection interior with a clear marker colour.
/// 4. Draw all chrome elements (border, handles, badge, buttons) using GDI,
///    using their real colours so they overwrite the markers.
/// 5. Scan every pixel in the buffer and assign premultiplied alpha:
///    - dim marker → `(0, 0, 0, DIM_ALPHA)`
///    - clear marker → `(0, 0, 0, INPUT_ALPHA_FLOOR)`
///    - any other colour (chrome) → keep RGB, set A = 255
/// 6. Call `UpdateLayeredWindow` with per-pixel alpha enabled.
///
/// # Marker colours
///
/// Marker colours must not appear in any chrome element's palette.
/// Chrome uses blues and whites; the markers are near-black.
///
/// GDI writes BGRA bytes with A = 0.  After drawing, pixels read from the
/// DIBSection buffer have the form `(A=0, R, G, B)` packed as
/// `(R << 16) | (G << 8) | B` in the low 24 bits.
///
/// DIM_MARKER  = COLORREF(0x00_00_00_01) → GDI stores R=1, G=0, B=0
/// CLEAR_MARKER = COLORREF(0x00_00_01_00) → GDI stores R=0, G=1, B=0
use crate::capture::native_region_overlay_layout::{HandleVisualKind, OverlayFrame, OverlayPhase};
use crate::capture::native_region_state::LocalSelectionRect;
use windows::core::w;
use windows::Win32::Foundation::{COLORREF, HANDLE, HWND, POINT, RECT, SIZE};
use windows::Win32::Graphics::Gdi::{
    CombineRgn, CreateCompatibleDC, CreateDIBSection, CreateFontW, CreatePen, CreateRectRgn,
    CreateSolidBrush, DeleteDC, DeleteObject, FillRect, GetDC, GetStockObject,
    GetTextExtentPoint32W, Rectangle, ReleaseDC, RoundRect, SelectClipRgn, SelectObject, SetBkMode,
    SetTextColor, TextOutW, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, BLENDFUNCTION,
    CLIP_DEFAULT_PRECIS, DEFAULT_CHARSET, DEFAULT_PITCH, DEFAULT_QUALITY, DIB_RGB_COLORS,
    FF_DONTCARE, FW_NORMAL, HDC, HGDIOBJ, NULL_BRUSH, OUT_DEFAULT_PRECIS, PS_DASH, PS_SOLID,
    RGN_OR, TRANSPARENT,
};
use windows::Win32::UI::WindowsAndMessaging::{UpdateLayeredWindow, ULW_ALPHA};

// ── Alpha constants ───────────────────────────────────────────────────────────

/// Alpha for pixels outside the active selection (55% opaque black).
const DIM_ALPHA: u8 = 140;

/// Minimum alpha that keeps the selection interior hittable.
/// Value 1 is visually indistinguishable from fully transparent to the user.
const INPUT_ALPHA_FLOOR: u8 = 1;

// ── Win32 COLORREF helpers ────────────────────────────────────────────────────

/// COLORREF(0x00BBGGRR) marker for dim pixels. RGB(1, 0, 0).
const DIM_MARKER_CR: COLORREF = COLORREF(0x00_00_00_01);
/// COLORREF(0x00BBGGRR) marker for clear pixels. RGB(0, 1, 0).
const CLEAR_MARKER_CR: COLORREF = COLORREF(0x00_00_01_00);

/// GDI DWORD for dim marker after `FillRect` (alpha byte = 0 from GDI):
/// memory BGRA = [0, 0, 1, 0] → DWORD 0x00_01_00_00
const DIM_MARKER_DWORD: u32 = 0x00_01_00_00;
/// GDI DWORD for clear marker: BGRA = [0, 1, 0, 0] → 0x00_00_01_00
const CLEAR_MARKER_DWORD: u32 = 0x00_00_01_00;

// ── Chrome colour constants (COLORREF = 0x00BBGGRR) ──────────────────────────
// Selection border — medium blue. RGB(100, 140, 255)
const C_BORDER: COLORREF = COLORREF(0x00FF8C64);
// Corner brackets and edge dots — indigo accent. RGB(130, 150, 255)
const C_BRIGHT: COLORREF = COLORREF(0x00_FF_96_82);
// Size badge background. RGB(24, 30, 50)
const C_BADGE_BG: COLORREF = COLORREF(0x00_32_1E_18);
// "Capture" button fill — vivid blue. RGB(75, 105, 245)
const C_BTN_CONFIRM: COLORREF = COLORREF(0x00_F5_69_4B);
// "Cancel" button fill — dark. RGB(30, 35, 52)
const C_BTN_CANCEL_BG: COLORREF = COLORREF(0x00_34_23_1E);
// "Cancel" button border. RGB(65, 75, 100)
const C_BTN_CANCEL_BD: COLORREF = COLORREF(0x00_64_4B_41);
// White text / labels
const C_WHITE: COLORREF = COLORREF(0x00_FF_FF_FF);

// ── Public entry point ────────────────────────────────────────────────────────

/// Render `frame` onto the layered selector window at virtual position
/// `(virtual_x, virtual_y)`.  Called once for every overlay update.
pub(super) fn render_overlay(
    hwnd: HWND,
    virtual_x: i32,
    virtual_y: i32,
    frame: &OverlayFrame,
) -> Result<(), String> {
    let w = frame.window_w;
    let h = frame.window_h;
    if w <= 0 || h <= 0 {
        return Ok(());
    }

    unsafe {
        let hdc_screen = GetDC(None);
        if hdc_screen.0.is_null() {
            return Err("GetDC failed".into());
        }

        let mem_dc = CreateCompatibleDC(Some(hdc_screen));
        if mem_dc.0.is_null() {
            ReleaseDC(None, hdc_screen);
            return Err("CreateCompatibleDC failed".into());
        }

        // ── Create 32-bit DIBSection ─────────────────────────────────────────
        let bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: w,
                biHeight: -h, // top-down
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

        let mut pixel_ptr = std::ptr::null_mut::<std::ffi::c_void>();
        let hbm = CreateDIBSection(
            Some(mem_dc),
            &bmi,
            DIB_RGB_COLORS,
            &mut pixel_ptr,
            Some(HANDLE::default()),
            0,
        );
        let hbm = match hbm {
            Ok(h) if !h.0.is_null() => h,
            _ => {
                let _ = DeleteDC(mem_dc);
                ReleaseDC(None, hdc_screen);
                return Err("CreateDIBSection failed".into());
            }
        };

        let old_bm = SelectObject(mem_dc, HGDIOBJ(hbm.0));

        // ── Step 1: Fill entire surface with dim marker ──────────────────────
        let dim_brush = CreateSolidBrush(DIM_MARKER_CR);
        let full_rect = RECT {
            left: 0,
            top: 0,
            right: w,
            bottom: h,
        };
        let _ = FillRect(mem_dc, &full_rect, dim_brush);
        let _ = DeleteObject(HGDIOBJ(dim_brush.0));

        // ── Step 2: Fill selection interior with clear marker ────────────────
        if let Some(sel) = frame.selection {
            let interior = RECT {
                left: sel.left,
                top: sel.top,
                right: sel.right,
                bottom: sel.bottom,
            };
            let clear_brush = CreateSolidBrush(CLEAR_MARKER_CR);
            let _ = FillRect(mem_dc, &interior, clear_brush);
            let _ = DeleteObject(HGDIOBJ(clear_brush.0));
        }

        // ── Step 3: Draw chrome ──────────────────────────────────────────────
        draw_chrome(mem_dc, frame);

        // ── Step 4: Scan pixels → assign premultiplied alpha ─────────────────
        let pixels = std::slice::from_raw_parts_mut(pixel_ptr as *mut u32, (w * h) as usize);
        for px in pixels.iter_mut() {
            let raw = *px & 0x00_FF_FF_FF; // low 24 bits = R<<16|G<<8|B (from GDI)
            if raw == DIM_MARKER_DWORD {
                // dim: black with DIM_ALPHA (premult = same since R=G=B=0)
                *px = (DIM_ALPHA as u32) << 24;
            } else if raw == CLEAR_MARKER_DWORD {
                // clear interior: near-transparent black
                *px = (INPUT_ALPHA_FLOOR as u32) << 24;
            } else {
                // Chrome pixel: A=255, keep RGB as-is (premult with A=255 is identity)
                *px = 0xFF_00_00_00 | raw;
            }
        }

        // ── Step 5: UpdateLayeredWindow ──────────────────────────────────────
        let window_pos = POINT {
            x: virtual_x,
            y: virtual_y,
        };
        let window_size = SIZE { cx: w, cy: h };
        let src_point = POINT { x: 0, y: 0 };
        let blend = BLENDFUNCTION {
            BlendOp: 0, // AC_SRC_OVER
            BlendFlags: 0,
            SourceConstantAlpha: 255,
            AlphaFormat: 1, // AC_SRC_ALPHA
        };

        let ok = UpdateLayeredWindow(
            hwnd,
            Some(hdc_screen),
            Some(&window_pos),
            Some(&window_size),
            Some(mem_dc),
            Some(&src_point),
            COLORREF(0),
            Some(&blend),
            ULW_ALPHA,
        );

        // ── Cleanup ──────────────────────────────────────────────────────────
        let _ = SelectObject(mem_dc, old_bm);
        let _ = DeleteObject(HGDIOBJ(hbm.0)); // hbm already verified non-null above
        let _ = DeleteDC(mem_dc);
        ReleaseDC(None, hdc_screen);

        if ok.is_err() {
            return Err("UpdateLayeredWindow failed".into());
        }
        Ok(())
    }
}

// ── Chrome drawing ────────────────────────────────────────────────────────────

unsafe fn draw_chrome(mem_dc: HDC, frame: &OverlayFrame) {
    let _ = SetBkMode(mem_dc, TRANSPARENT);

    if let Some(sel) = frame.selection {
        // Selection border
        draw_selection_border(mem_dc, sel);

        // Handles (corner brackets + edge dots)
        for h in &frame.handles {
            match h.kind {
                HandleVisualKind::CornerBracket { arm } => {
                    draw_corner_bracket(mem_dc, h.cx, h.cy, sel, arm);
                }
                HandleVisualKind::EdgeDot { radius } => {
                    draw_edge_dot(mem_dc, h.cx, h.cy, radius, sel);
                }
            }
        }

        // Size badge (only when there is text)
        if !frame.badge_text.is_empty() {
            draw_badge(mem_dc, sel.left, sel.top, &frame.badge_text);
        }
    }

    // CTA buttons
    if frame.phase == OverlayPhase::Adjusting {
        if let Some(buttons) = frame.buttons {
            draw_confirm_button(mem_dc, &buttons.confirm);
            draw_cancel_button(mem_dc, &buttons.cancel);
        }
    }

    // Guide lines (P2 extension — draws nothing in P1.5)
    for guide in &frame.guide_lines {
        use crate::capture::native_region_overlay_layout::GuideAxis;
        let pen = CreatePen(PS_SOLID, 1, C_BRIGHT);
        let old_pen = SelectObject(mem_dc, HGDIOBJ(pen.0));
        let old_br = SelectObject(mem_dc, GetStockObject(NULL_BRUSH));
        match guide.axis {
            GuideAxis::Horizontal => {
                let _ = Rectangle(mem_dc, 0, guide.coord - 1, frame.window_w, guide.coord + 1);
            }
            GuideAxis::Vertical => {
                let _ = Rectangle(mem_dc, guide.coord - 1, 0, guide.coord + 1, frame.window_h);
            }
        }
        let _ = SelectObject(mem_dc, old_pen);
        let _ = SelectObject(mem_dc, old_br);
        let _ = DeleteObject(HGDIOBJ(pen.0));
    }
}

/// Dashed blue rectangle border at the selection boundary.
unsafe fn draw_selection_border(mem_dc: HDC, sel: LocalSelectionRect) {
    let pen = CreatePen(PS_DASH, 1, C_BORDER);
    let old_pen = SelectObject(mem_dc, HGDIOBJ(pen.0));
    let old_br = SelectObject(mem_dc, GetStockObject(NULL_BRUSH));

    // Draw full rounded rectangle. During Adjusting phase, the solid 3px corner
    // brackets will perfectly overdraw and hide the corners of this 1px dashed line.
    let _ = RoundRect(mem_dc, sel.left, sel.top, sel.right, sel.bottom, 16, 16);

    let _ = SelectObject(mem_dc, old_pen);
    let _ = SelectObject(mem_dc, old_br);
    let _ = DeleteObject(HGDIOBJ(pen.0));
}

/// L-shaped corner bracket at `(cx, cy)` relative to `sel`.
/// Uses a clip region so it properly curves using RoundRect.
unsafe fn draw_corner_bracket(mem_dc: HDC, cx: i32, cy: i32, sel: LocalSelectionRect, arm: i32) {
    const C_THK: i32 = 4;
    let on_left = cx <= sel.left;
    let on_top = cy <= sel.top;

    let h = RECT {
        left: if on_left { cx - C_THK } else { cx - arm },
        top: cy - C_THK,
        right: if on_left { cx + arm } else { cx + C_THK },
        bottom: cy + C_THK,
    };
    let v = RECT {
        left: cx - C_THK,
        top: if on_top { cy - C_THK } else { cy - arm },
        right: cx + C_THK,
        bottom: if on_top { cy + arm } else { cy + C_THK },
    };

    let rgn1 = CreateRectRgn(h.left, h.top, h.right, h.bottom);
    let rgn2 = CreateRectRgn(v.left, v.top, v.right, v.bottom);
    let _ = CombineRgn(Some(rgn1), Some(rgn1), Some(rgn2), RGN_OR);

    let _ = SelectClipRgn(mem_dc, Some(rgn1));

    let pen = CreatePen(PS_SOLID, 3, C_BRIGHT);
    let old_pen = SelectObject(mem_dc, HGDIOBJ(pen.0));
    let old_br = SelectObject(mem_dc, GetStockObject(NULL_BRUSH));
    let _ = RoundRect(mem_dc, sel.left, sel.top, sel.right, sel.bottom, 16, 16);

    let _ = SelectObject(mem_dc, old_pen);
    let _ = SelectObject(mem_dc, old_br);
    let _ = DeleteObject(HGDIOBJ(pen.0));

    let _ = SelectClipRgn(mem_dc, None);
    let _ = DeleteObject(HGDIOBJ(rgn1.0));
    let _ = DeleteObject(HGDIOBJ(rgn2.0));
}

/// Small filled edge segment at an edge midpoint.
unsafe fn draw_edge_dot(mem_dc: HDC, cx: i32, cy: i32, _radius: i32, sel: LocalSelectionRect) {
    let brush = CreateSolidBrush(C_BRIGHT);
    const MID_LEN: i32 = 24;
    const MID_THK: i32 = 3;
    let mut rect = RECT::default();

    let is_horizontal = cy == sel.top || cy == sel.bottom;
    if is_horizontal {
        rect.left = cx - MID_LEN / 2;
        rect.right = cx + MID_LEN / 2;
        rect.top = if cy == sel.top { cy } else { cy - MID_THK };
        rect.bottom = if cy == sel.top { cy + MID_THK } else { cy };
    } else {
        rect.top = cy - MID_LEN / 2;
        rect.bottom = cy + MID_LEN / 2;
        rect.left = if cx == sel.left { cx } else { cx - MID_THK };
        rect.right = if cx == sel.left { cx + MID_THK } else { cx };
    }

    let _ = FillRect(mem_dc, &rect, brush);
    let _ = DeleteObject(HGDIOBJ(brush.0));
}

/// Create a standard Segoe UI font of the given height.
unsafe fn create_ui_font(height: i32) -> windows::Win32::Graphics::Gdi::HFONT {
    CreateFontW(
        height,
        0,
        0,
        0,
        FW_NORMAL.0 as i32,
        0,
        0,
        0,
        DEFAULT_CHARSET,
        OUT_DEFAULT_PRECIS,
        CLIP_DEFAULT_PRECIS,
        DEFAULT_QUALITY,
        (DEFAULT_PITCH.0 | FF_DONTCARE.0) as u32,
        w!("Segoe UI"),
    )
}

/// Floating size badge pill above the top-left of the selection.
unsafe fn draw_badge(mem_dc: HDC, sel_left: i32, sel_top: i32, text: &str) {
    let text_u16: Vec<u16> = text.encode_utf16().collect();

    let hfont = create_ui_font(14);
    let old_font = SelectObject(mem_dc, HGDIOBJ(hfont.0));

    // Measure actual text size so the pill fits exactly.
    let (tw, th) = text_extent(mem_dc, &text_u16);
    let pad_x = 10_i32;
    let badge_w = tw + pad_x * 2;
    let badge_h = 24_i32;

    let bx = sel_left.max(2);
    let by = (sel_top - badge_h - 8).max(2);

    let corner = badge_h;

    let bg_brush = CreateSolidBrush(C_BADGE_BG);
    let bp = CreatePen(PS_SOLID, 1, C_BORDER);
    let old_pen = SelectObject(mem_dc, HGDIOBJ(bp.0));
    let old_br = SelectObject(mem_dc, HGDIOBJ(bg_brush.0));
    let _ = RoundRect(mem_dc, bx, by, bx + badge_w, by + badge_h, corner, corner);
    let _ = SelectObject(mem_dc, old_pen);
    let _ = SelectObject(mem_dc, old_br);
    let _ = DeleteObject(HGDIOBJ(bp.0));
    let _ = DeleteObject(HGDIOBJ(bg_brush.0));

    let tx = bx + (badge_w - tw) / 2;
    let ty = by + (badge_h - th) / 2;
    let _ = SetBkMode(mem_dc, TRANSPARENT);
    let _ = SetTextColor(mem_dc, C_WHITE);
    let _ = TextOutW(mem_dc, tx, ty, &text_u16);

    let _ = SelectObject(mem_dc, old_font);
    let _ = DeleteObject(HGDIOBJ(hfont.0));
}

/// Measure the rendered extent of `text` with the current DC font.
/// Returns (width, height) in pixels.
unsafe fn text_extent(mem_dc: HDC, text: &[u16]) -> (i32, i32) {
    let mut sz = SIZE::default();
    let _ = GetTextExtentPoint32W(mem_dc, text, &mut sz);
    (sz.cx, sz.cy)
}

/// Draw `text` centered inside `rect` on top of a filled background.
unsafe fn draw_centered_text(mem_dc: HDC, text: &[u16], rect: &RECT, text_color: COLORREF) {
    let hfont = create_ui_font(17); // Tăng font size cho CTA
    let old_font = SelectObject(mem_dc, HGDIOBJ(hfont.0));

    let (tw, th) = text_extent(mem_dc, text);
    let rw = rect.right - rect.left;
    let rh = rect.bottom - rect.top;
    let x = rect.left + (rw - tw) / 2;
    let y = rect.top + (rh - th) / 2;

    let _ = SetBkMode(mem_dc, TRANSPARENT);
    let _ = SetTextColor(mem_dc, text_color);
    let _ = TextOutW(mem_dc, x, y, text);

    let _ = SelectObject(mem_dc, old_font);
    let _ = DeleteObject(HGDIOBJ(hfont.0));
}

/// "Capture" (confirm) pill button — blue fill, white centered label.
unsafe fn draw_confirm_button(mem_dc: HDC, btn: &RECT) {
    let radius = btn.bottom - btn.top;
    let bg_brush = CreateSolidBrush(C_BTN_CONFIRM);
    // Dùng NULL_PEN thay vì Solid Pen cùng màu để giảm bớt hiện tượng răng cưa của GDI
    let old_pen = SelectObject(
        mem_dc,
        GetStockObject(windows::Win32::Graphics::Gdi::NULL_PEN),
    );
    let old_br = SelectObject(mem_dc, HGDIOBJ(bg_brush.0));
    let _ = RoundRect(
        mem_dc, btn.left, btn.top, btn.right, btn.bottom, radius, radius,
    );
    let _ = SelectObject(mem_dc, old_pen);
    let _ = SelectObject(mem_dc, old_br);
    let _ = DeleteObject(HGDIOBJ(bg_brush.0));

    let label: Vec<u16> = "\u{1F4F7} Capture".encode_utf16().collect();
    draw_centered_text(mem_dc, &label, btn, C_WHITE);
}

/// "Cancel" pill button — dark fill with border, centered "× Cancel" label.
unsafe fn draw_cancel_button(mem_dc: HDC, btn: &RECT) {
    let radius = btn.bottom - btn.top;
    let bg_brush = CreateSolidBrush(C_BTN_CANCEL_BG);
    let bp = CreatePen(PS_SOLID, 1, C_BTN_CANCEL_BD);
    let old_pen = SelectObject(mem_dc, HGDIOBJ(bp.0));
    let old_br = SelectObject(mem_dc, HGDIOBJ(bg_brush.0));
    let _ = RoundRect(
        mem_dc, btn.left, btn.top, btn.right, btn.bottom, radius, radius,
    );
    let _ = SelectObject(mem_dc, old_pen);
    let _ = SelectObject(mem_dc, old_br);
    let _ = DeleteObject(HGDIOBJ(bp.0));
    let _ = DeleteObject(HGDIOBJ(bg_brush.0));

    let label: Vec<u16> = "\u{00D7} Cancel".encode_utf16().collect();
    draw_centered_text(mem_dc, &label, btn, C_WHITE);
}
