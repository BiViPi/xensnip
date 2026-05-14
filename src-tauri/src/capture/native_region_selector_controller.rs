/// Interaction controller for the native region selector overlay.
///
/// Translates Win32 `WM_*` messages into `SelectorState` calls, runs snap
/// logic for handle drags, rebuilds the overlay frame, and triggers the renderer.
/// `window_proc` calls one named handler per message instead of embedding
/// behaviour inline.
use crate::capture::native_region_geometry::{
    global_to_local_rect, handle_hit_rects, hit_test_handle, hit_test_interior, rect_contains,
};
use crate::capture::native_region_overlay_layout::build_overlay_frame;
use crate::capture::native_region_overlay_renderer::render_overlay;
use crate::capture::native_region_snap::{apply_handle_snap, SnapRuntimeState};
use crate::capture::native_region_state::{AdjustDragSnapshot, HandleId, SelectorState};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    ReleaseCapture, SetCapture, VK_ESCAPE, VK_RETURN,
};
use windows::Win32::UI::WindowsAndMessaging::{
    IDC_CROSS, IDC_HAND, IDC_SIZEALL, IDC_SIZENESW, IDC_SIZENS, IDC_SIZENWSE,
    IDC_SIZEWE, LoadCursorW,
};

// ── Window state passed into every handler ────────────────────────────────────

pub(super) struct SelectorWindowState {
    pub app: tauri::AppHandle,
    pub selection: SelectorState,
    pub window_w: i32,
    pub window_h: i32,
    /// Cached confirm button rect (local coords). Updated after every frame rebuild.
    pub confirm_btn: RECT,
    /// Cached cancel button rect (local coords). Updated after every frame rebuild.
    pub cancel_btn: RECT,
    /// Snap runtime: guide candidates + per-drag tracker + active guide lines.
    pub snap: SnapRuntimeState,
}

// ── Action returned to window_proc ───────────────────────────────────────────

pub(super) enum ControllerAction {
    /// Normal interaction: frame was repainted, no window close needed.
    Continue,
    /// User confirmed: set outcome and destroy window.
    DestroyAndConfirm,
    /// User cancelled: set outcome and destroy window.
    DestroyAndCancel,
}

// ── Handlers ─────────────────────────────────────────────────────────────────

pub(super) fn on_mouse_down(
    hwnd: HWND,
    state: &mut SelectorWindowState,
    lx: i32,
    ly: i32,
) -> ControllerAction {
    if state.selection.is_adjusting() {
        // Buttons take priority.
        if rect_contains(&state.confirm_btn, lx, ly) {
            log::info!(target: "capture::controller", "confirm button clicked");
            state.selection.confirm_adjust();
            return ControllerAction::DestroyAndConfirm;
        }
        if rect_contains(&state.cancel_btn, lx, ly) {
            log::info!(target: "capture::controller", "cancel button clicked");
            state.selection.cancel();
            return ControllerAction::DestroyAndCancel;
        }

        // Hit-test resize handles, then interior (move drag).
        if let Some(g) = state.selection.current_adjust_rect().copied() {
            let local = global_to_local_rect(g, state.selection.virtual_x, state.selection.virtual_y);
            let hit_rects = handle_hit_rects(local);
            if let Some(which) = hit_test_handle(&hit_rects, lx, ly) {
                state.selection.adjust_handle_begin(which, lx, ly);
                state.snap.begin_handle_drag(); // reset tracker for this new drag
                unsafe { let _ = SetCapture(hwnd); }
            } else if hit_test_interior(local, lx, ly) {
                state.selection.adjust_move_begin(lx, ly);
                state.snap.clear_active(); // no snap for move drag
                unsafe { let _ = SetCapture(hwnd); }
            }
        }
    } else if !state.selection.is_selecting() {
        // Idle → begin drag.
        let anchor = state.selection.begin_selection(lx, ly);
        unsafe { let _ = SetCapture(hwnd); }
        log::info!(target: "capture::controller", "anchor {},{}", anchor.gx, anchor.gy);
    }
    // Selecting with mouse captured: second LBUTTONDOWN is unusual, ignore.

    repaint(hwnd, state);
    ControllerAction::Continue
}

pub(super) fn on_mouse_up(
    hwnd: HWND,
    state: &mut SelectorWindowState,
    lx: i32,
    ly: i32,
) -> ControllerAction {
    if state.selection.is_selecting() {
        unsafe { let _ = ReleaseCapture(); }
        let ok = state.selection.try_enter_adjust(lx, ly);
        if ok {
            // Detect edge candidates for the new selection.
            if let Some(g) = state.selection.current_adjust_rect().copied() {
                state.snap.refresh_guides(g);
            }
            rebuild_button_cache(state);
            repaint(hwnd, state);
            log::info!(target: "capture::controller", "entered adjusting phase");
        } else {
            log::info!(target: "capture::controller", "rect too small — cancel");
            state.selection.cancel();
            return ControllerAction::DestroyAndCancel;
        }
    } else if state.selection.is_drag_active() {
        let was_move = matches!(
            state.selection.current_adjust_drag(),
            AdjustDragSnapshot::Move { .. }
        );

        state.snap.clear_active(); // guide lines disappear on drag end
        state.selection.adjust_drag_end();
        unsafe { let _ = ReleaseCapture(); }

        if was_move {
            // Refresh guide candidates for the new rect position.
            if let Some(g) = state.selection.current_adjust_rect().copied() {
                state.snap.refresh_guides(g);
            }
        }

        rebuild_button_cache(state);
        repaint(hwnd, state);
    }
    ControllerAction::Continue
}

pub(super) fn on_mouse_move(
    hwnd: HWND,
    state: &mut SelectorWindowState,
    lx: i32,
    ly: i32,
) {
    if state.selection.is_selecting() {
        let _ = state.selection.update_selection(lx, ly);
        repaint(hwnd, state);
        set_cursor_cross();
    } else if state.selection.is_adjusting() {
        if state.selection.is_drag_active() {
            let _ = state.selection.adjust_drag_update(lx, ly);

            // Apply snap only for handle drags; move drags are snap-free.
            if let AdjustDragSnapshot::Handle { which, .. } = state.selection.current_adjust_drag() {
                if let Some(raw_rect) = state.selection.current_adjust_rect().copied() {
                    let (snapped, active) = apply_handle_snap(
                        raw_rect,
                        which,
                        &state.snap.guides,
                        &mut state.snap.tracker,
                    );
                    state.selection.set_adjust_rect(snapped);
                    state.snap.active_guides = active;
                }
            }
            // Move-drag case: active_guides already cleared in on_mouse_down.

            rebuild_button_cache(state);
            repaint(hwnd, state);
        }
        update_cursor(state, lx, ly);
    }
}

pub(super) fn on_double_click(
    state: &mut SelectorWindowState,
    lx: i32,
    ly: i32,
) -> ControllerAction {
    if state.selection.is_adjusting() {
        if let Some(g) = state.selection.current_adjust_rect().copied() {
            let local = global_to_local_rect(g, state.selection.virtual_x, state.selection.virtual_y);
            if hit_test_interior(local, lx, ly) {
                if state.selection.is_drag_active() {
                    state.snap.clear_active();
                    state.selection.adjust_drag_end();
                    unsafe { let _ = ReleaseCapture(); }
                }
                log::info!(target: "capture::controller", "double-click confirm");
                state.selection.confirm_adjust();
                return ControllerAction::DestroyAndConfirm;
            }
        }
    }
    ControllerAction::Continue
}

pub(super) fn on_key_down(
    state: &mut SelectorWindowState,
    vk: u16,
) -> ControllerAction {
    if vk == VK_ESCAPE.0 {
        release_capture_if_needed(state);
        state.snap.clear_active();
        state.selection.cancel();
        log::info!(target: "capture::controller", "Escape cancel");
        return ControllerAction::DestroyAndCancel;
    }
    if vk == VK_RETURN.0 && state.selection.is_adjusting() {
        if state.selection.is_drag_active() {
            state.snap.clear_active();
            state.selection.adjust_drag_end();
            unsafe { let _ = ReleaseCapture(); }
        }
        log::info!(target: "capture::controller", "Enter confirm");
        state.selection.confirm_adjust();
        return ControllerAction::DestroyAndConfirm;
    }
    ControllerAction::Continue
}

pub(super) fn on_set_cursor(state: &SelectorWindowState, lx: i32, ly: i32) {
    if state.selection.is_adjusting() {
        update_cursor(state, lx, ly);
    } else {
        set_cursor_cross();
    }
}

pub(super) fn on_destroy(state: Box<SelectorWindowState>) -> crate::capture::native_region_state::SelectionOutcome {
    if state.selection.is_selecting() || state.selection.is_drag_active() {
        unsafe { let _ = ReleaseCapture(); }
    }
    state.selection.outcome().clone()
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn repaint(hwnd: HWND, state: &SelectorWindowState) {
    let frame = build_overlay_frame(
        &state.selection,
        state.window_w,
        state.window_h,
        &state.snap.active_guides,
    );
    let _ = render_overlay(
        hwnd,
        state.selection.virtual_x,
        state.selection.virtual_y,
        &frame,
    );
}

fn rebuild_button_cache(state: &mut SelectorWindowState) {
    if let Some(g) = state.selection.current_adjust_rect() {
        let local = global_to_local_rect(
            *g,
            state.selection.virtual_x,
            state.selection.virtual_y,
        );
        let layout = crate::capture::native_region_overlay_layout::compute_button_layout(
            local,
            state.window_w,
            state.window_h,
        );
        state.confirm_btn = layout.confirm;
        state.cancel_btn = layout.cancel;
    }
}

fn release_capture_if_needed(state: &SelectorWindowState) {
    if state.selection.is_selecting() || state.selection.is_drag_active() {
        unsafe { let _ = ReleaseCapture(); }
    }
}

fn update_cursor(state: &SelectorWindowState, lx: i32, ly: i32) {
    if rect_contains(&state.confirm_btn, lx, ly) || rect_contains(&state.cancel_btn, lx, ly) {
        set_cursor(IDC_HAND);
        return;
    }
    if let Some(g) = state.selection.current_adjust_rect() {
        let local = global_to_local_rect(*g, state.selection.virtual_x, state.selection.virtual_y);
        let hit = handle_hit_rects(local);
        if let Some(which) = hit_test_handle(&hit, lx, ly) {
            let id = match which {
                HandleId::NW | HandleId::SE => IDC_SIZENWSE,
                HandleId::NE | HandleId::SW => IDC_SIZENESW,
                HandleId::N  | HandleId::S  => IDC_SIZENS,
                HandleId::W  | HandleId::E  => IDC_SIZEWE,
            };
            set_cursor(id);
            return;
        }
        if hit_test_interior(local, lx, ly) {
            set_cursor(IDC_SIZEALL);
            return;
        }
    }
    set_cursor_cross();
}

fn set_cursor(id: windows::core::PCWSTR) {
    unsafe {
        if let Ok(c) = LoadCursorW(None, id) {
            let _ = windows::Win32::UI::WindowsAndMessaging::SetCursor(Some(c));
        }
    }
}

fn set_cursor_cross() {
    set_cursor(IDC_CROSS);
}
