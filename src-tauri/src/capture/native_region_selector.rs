/// Native region selector — lifecycle and Win32 message dispatch only.
///
/// This module owns:
/// - window-class registration
/// - selector window creation and destruction
/// - message-loop bootstrap
/// - thin `window_proc` dispatch to the controller
///
/// Interaction logic lives in `native_region_selector_controller`.
/// Overlay layout lives in `native_region_overlay_layout`.
/// Per-pixel rendering lives in `native_region_overlay_renderer`.
use crate::capture::errors::CaptureError;
use crate::capture::native_region_active::active_window_slot;
use crate::capture::native_region_geometry::{get_x_lparam, get_y_lparam};
use crate::capture::native_region_overlay_layout::build_overlay_frame;
use crate::capture::native_region_overlay_renderer::render_overlay;
use crate::capture::native_region_selector_controller::{
    on_destroy, on_double_click, on_key_down, on_mouse_down, on_mouse_move, on_mouse_up,
    on_set_cursor, ControllerAction, SelectorWindowState,
};
use crate::capture::native_region_state::SelectorState;
use std::sync::{Mutex, Once};
use tauri::{AppHandle, Manager};
use windows::core::w;
use windows::Win32::Foundation::{HINSTANCE, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::SetFocus;
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, CS_DBLCLKS, DefWindowProcW, DestroyWindow, DispatchMessageW, GetMessageW,
    GetCursorPos, GetSystemMetrics, GetWindowRect, LoadCursorW, MSG, PostQuitMessage,
    RegisterClassW, SetForegroundWindow, ShowWindow, TranslateMessage, CREATESTRUCTW,
    GWLP_USERDATA, IDC_CROSS, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
    SM_YVIRTUALSCREEN, SW_SHOW, WM_DESTROY, WM_ERASEBKGND, WM_KEYDOWN, WM_LBUTTONDOWN,
    WM_LBUTTONDBLCLK, WM_LBUTTONUP, WM_MOUSEACTIVATE, WM_MOUSEMOVE, WM_NCCREATE, WM_SETCURSOR,
    WNDCLASSW, WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_POPUP, MA_ACTIVATE,
};
use xcap::Monitor;

const WINDOW_CLASS: windows::core::PCWSTR = w!("XenSnipNativeRegionSelectorV2");
pub use crate::capture::native_region_state::SelectionOutcome;

// ── Selector surface bounds ───────────────────────────────────────────────────

struct SelectorSurfaceBounds {
    x: i32,
    y: i32,
    w: i32,
    h: i32,
}

static CLASS_REGISTERED: Once = Once::new();

// ── Public API ────────────────────────────────────────────────────────────────

pub fn show_selector(app: &AppHandle) -> Result<SelectionOutcome, CaptureError> {
    register_class().map_err(|e| {
        log::error!(target: "capture::selector", "{}", e);
        CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "native_selector_register_failed",
            "Failed to register native region selector window.",
        )
    })?;

    {
        if active_window_slot().lock().unwrap().is_some() {
            return Err(CaptureError::Busy());
        }
    }

    run_native_selector(app.clone()).map_err(|e| {
        log::error!(target: "capture::selector", "{}", e);
        CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "native_selector_run_failed",
            &format!("Failed to run native region selector: {}", e),
        )
    })
}

// ── Window class registration ─────────────────────────────────────────────────

fn register_class() -> Result<(), String> {
    let mut result = Ok(());
    CLASS_REGISTERED.call_once(|| {
        let instance = match unsafe { GetModuleHandleW(None) } {
            Ok(v) => v,
            Err(e) => { result = Err(format!("GetModuleHandleW: {}", e)); return; }
        };
        let cursor = match unsafe { LoadCursorW(None, IDC_CROSS) } {
            Ok(v) => v,
            Err(e) => { result = Err(format!("LoadCursorW: {}", e)); return; }
        };
        let class = WNDCLASSW {
            style: CS_DBLCLKS,
            lpfnWndProc: Some(window_proc),
            hInstance: instance.into(),
            hCursor: cursor,
            lpszClassName: WINDOW_CLASS,
            ..Default::default()
        };
        if unsafe { RegisterClassW(&class) } == 0 {
            result = Err("RegisterClassW failed".into());
        }
    });
    result
}

// ── Selector message loop ─────────────────────────────────────────────────────

fn resolve_surface(app: &AppHandle) -> SelectorSurfaceBounds {
    let settings = crate::settings::load_or_create_default(app);
    if settings.capture_all_monitors {
        return SelectorSurfaceBounds {
            x: unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) },
            y: unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) },
            w: unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) },
            h: unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) },
        };
    }
    if let Ok(monitors) = Monitor::all() {
        if let Some(p) = monitors.into_iter().find(|m| m.is_primary().unwrap_or(false)) {
            return SelectorSurfaceBounds {
                x: p.x().unwrap_or(0),
                y: p.y().unwrap_or(0),
                w: p.width().unwrap_or(1920) as i32,
                h: p.height().unwrap_or(1080) as i32,
            };
        }
    }
    SelectorSurfaceBounds {
        x: unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) },
        y: unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) },
        w: unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) },
        h: unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) },
    }
}

fn run_native_selector(app: AppHandle) -> Result<SelectionOutcome, String> {
    let surf = resolve_surface(&app);
    log::info!(
        target: "capture::selector",
        "opening overlay x={} y={} w={} h={}",
        surf.x, surf.y, surf.w, surf.h
    );

    let state = Box::new(SelectorWindowState {
        app,
        selection: SelectorState::new(surf.x, surf.y),
        window_w: surf.w,
        window_h: surf.h,
        confirm_btn: RECT::default(),
        cancel_btn: RECT::default(),
        snap: Default::default(),
    });

    let module = unsafe { GetModuleHandleW(None).map_err(|e| e.to_string())? };
    let hwnd = unsafe {
        CreateWindowExW(
            WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
            WINDOW_CLASS,
            w!("XenSnip Region Selector"),
            WS_POPUP,
            surf.x, surf.y, surf.w, surf.h,
            None, None,
            Some(HINSTANCE(module.0)),
            Some(Box::into_raw(state) as *const _),
        )
    }
    .map_err(|e| e.to_string())?;

    {
        let mut guard = active_window_slot().lock().unwrap();
        *guard = Some(hwnd.0 as isize);
    }

    unsafe {
        // No SetLayeredWindowAttributes — per-pixel alpha is managed by
        // render_overlay → UpdateLayeredWindow.
        let _ = ShowWindow(hwnd, SW_SHOW);
        activate_selector_window(hwnd);

        // Initial render: full dim, no selection yet.
        if let Some(ws) = state_mut(hwnd) {
            let frame = build_overlay_frame(
                &ws.selection, ws.window_w, ws.window_h, &ws.snap.active_guides,
            );
            let _ = render_overlay(hwnd, ws.selection.virtual_x, ws.selection.virtual_y, &frame);
        }

        // Set cross cursor now to avoid any leftover wait/arrow cursor.
        if let Ok(c) = LoadCursorW(None, IDC_CROSS) {
            let _ = windows::Win32::UI::WindowsAndMessaging::SetCursor(Some(c));
        }
    }

    let mut msg = MSG::default();
    while unsafe { GetMessageW(&mut msg, None, 0, 0) }.into() {
        unsafe {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    Ok(LAST_OUTCOME.with(|cell| {
        cell.lock().unwrap().take().unwrap_or(SelectionOutcome::Cancelled)
    }))
}

thread_local! {
    static LAST_OUTCOME: Mutex<Option<SelectionOutcome>> = const { Mutex::new(None) };
}

// ── Window state accessor ─────────────────────────────────────────────────────

unsafe fn state_mut(hwnd: HWND) -> Option<&'static mut SelectorWindowState> {
    let ptr = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(hwnd, GWLP_USERDATA)
        as *mut SelectorWindowState;
    ptr.as_mut()
}

// ── Window procedure ──────────────────────────────────────────────────────────

unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_NCCREATE => {
            let create = &*(lparam.0 as *const CREATESTRUCTW);
            let ptr = create.lpCreateParams as *mut SelectorWindowState;
            let _ = windows::Win32::UI::WindowsAndMessaging::SetWindowLongPtrW(
                hwnd,
                GWLP_USERDATA,
                ptr as isize,
            );
            LRESULT(1)
        }

        // Layered window handles its own erase via UpdateLayeredWindow.
        WM_ERASEBKGND => LRESULT(1),

        WM_MOUSEACTIVATE => {
            activate_selector_window(hwnd);
            LRESULT(MA_ACTIVATE as isize)
        }

        WM_SETCURSOR => {
            if let Some(state) = state_mut(hwnd) {
                let mut pt = POINT::default();
                if GetCursorPos(&mut pt).is_ok() {
                    let mut window_rect = RECT::default();
                    if GetWindowRect(hwnd, &mut window_rect).is_ok() {
                        on_set_cursor(state, pt.x - window_rect.left, pt.y - window_rect.top);
                    } else {
                        on_set_cursor(state, 0, 0);
                    }
                } else {
                    on_set_cursor(state, 0, 0);
                }
            }
            LRESULT(1)
        }

        WM_LBUTTONDOWN => {
            activate_selector_window(hwnd);
            if let Some(state) = state_mut(hwnd) {
                let lx = get_x_lparam(lparam);
                let ly = get_y_lparam(lparam);
                match on_mouse_down(hwnd, state, lx, ly) {
                    ControllerAction::DestroyAndConfirm => {
                        store_outcome(state.selection.outcome().clone());
                        let _ = DestroyWindow(hwnd);
                    }
                    ControllerAction::DestroyAndCancel => {
                        store_outcome(SelectionOutcome::Cancelled);
                        let _ = DestroyWindow(hwnd);
                    }
                    ControllerAction::Continue => {}
                }
            }
            LRESULT(0)
        }

        WM_LBUTTONUP => {
            if let Some(state) = state_mut(hwnd) {
                let lx = get_x_lparam(lparam);
                let ly = get_y_lparam(lparam);
                if let ControllerAction::DestroyAndCancel = on_mouse_up(hwnd, state, lx, ly) {
                    store_outcome(SelectionOutcome::Cancelled);
                    let _ = DestroyWindow(hwnd);
                }
            }
            LRESULT(0)
        }

        WM_LBUTTONDBLCLK => {
            if let Some(state) = state_mut(hwnd) {
                let lx = get_x_lparam(lparam);
                let ly = get_y_lparam(lparam);
                if let ControllerAction::DestroyAndConfirm = on_double_click(state, lx, ly) {
                    store_outcome(state.selection.outcome().clone());
                    let _ = DestroyWindow(hwnd);
                }
            }
            LRESULT(0)
        }

        WM_MOUSEMOVE => {
            if let Some(state) = state_mut(hwnd) {
                on_mouse_move(hwnd, state, get_x_lparam(lparam), get_y_lparam(lparam));
            }
            LRESULT(0)
        }

        WM_KEYDOWN => {
            if let Some(state) = state_mut(hwnd) {
                let vk = wparam.0 as u16;
                match on_key_down(state, vk) {
                    ControllerAction::DestroyAndConfirm => {
                        store_outcome(state.selection.outcome().clone());
                        let _ = DestroyWindow(hwnd);
                        return LRESULT(0);
                    }
                    ControllerAction::DestroyAndCancel => {
                        store_outcome(SelectionOutcome::Cancelled);
                        let _ = DestroyWindow(hwnd);
                        return LRESULT(0);
                    }
                    ControllerAction::Continue => {}
                }
            }
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }

        WM_DESTROY => {
            {
                let mut guard = active_window_slot().lock().unwrap();
                *guard = None;
            }

            let ptr = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(
                hwnd,
                GWLP_USERDATA,
            ) as *mut SelectorWindowState;

            if !ptr.is_null() {
                let state = Box::from_raw(ptr);
                let app = state.app.clone();
                let outcome = on_destroy(state);
                LAST_OUTCOME.with(|cell| {
                    let mut guard = cell.lock().unwrap();
                    if guard.is_none() {
                        *guard = Some(outcome.clone());
                    }
                });
                if let SelectionOutcome::Cancelled = outcome {
                    finish_session(&app);
                }
            }

            PostQuitMessage(0);
            LRESULT(0)
        }

        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn finish_session(app: &AppHandle) {
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }
}

fn store_outcome(outcome: SelectionOutcome) {
    LAST_OUTCOME.with(|cell| {
        *cell.lock().unwrap() = Some(outcome);
    });
}

fn activate_selector_window(hwnd: HWND) {
    unsafe {
        let _ = SetForegroundWindow(hwnd);
        let _ = SetFocus(Some(hwnd));
    }
}
