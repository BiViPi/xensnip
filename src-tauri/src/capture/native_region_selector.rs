use crate::capture::errors::CaptureError;
use crate::capture::native_region_active::active_window_slot;
use crate::capture::native_region_geometry::{
    get_x_lparam, get_y_lparam, invalidate_selection_bounds, selection_bounds,
};
use crate::capture::native_region_paint::selection_paint_geometry;
use crate::capture::native_region_state::{LocalSelectionRect, SelectorState};
use std::sync::{Mutex, Once};
use tauri::{AppHandle, Manager};
use windows::core::w;
use windows::Win32::Foundation::{COLORREF, HINSTANCE, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    BeginPaint, BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, CreatePen, DeleteDC,
    DeleteObject, EndPaint, FillRect, GetStockObject, Rectangle, SelectObject, SetBkMode,
    SetTextColor, TextOutW, UpdateWindow, BLACK_BRUSH, HBRUSH, HGDIOBJ, NULL_BRUSH, PAINTSTRUCT,
    PS_SOLID, SRCCOPY, TRANSPARENT,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    ReleaseCapture, SetCapture, SetFocus, VK_ESCAPE,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetMessageW,
    GetSystemMetrics, LoadCursorW, PostQuitMessage, RegisterClassW, SetForegroundWindow,
    SetLayeredWindowAttributes, ShowWindow, TranslateMessage, CREATESTRUCTW, GWLP_USERDATA,
    IDC_CROSS, LWA_ALPHA, MSG, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
    SM_YVIRTUALSCREEN, SW_SHOW, WM_DESTROY, WM_ERASEBKGND, WM_KEYDOWN, WM_LBUTTONDOWN,
    WM_LBUTTONUP, WM_MOUSEMOVE, WM_NCCREATE, WNDCLASSW, WS_EX_LAYERED, WS_EX_TOOLWINDOW,
    WS_EX_TOPMOST, WS_POPUP,
};
use xcap::Monitor;

const WINDOW_CLASS: windows::core::PCWSTR = w!("XenSnipNativeRegionSelector");
pub use crate::capture::native_region_state::SelectionOutcome;

struct SelectorWindowState {
    app: AppHandle,
    selection: SelectorState,
}

struct SelectorSurfaceBounds {
    x: i32,
    y: i32,
    w: i32,
    h: i32,
}

static CLASS_REGISTERED: Once = Once::new();

fn finish_session(app: &AppHandle) {
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }
}

unsafe fn state_mut(hwnd: HWND) -> Option<&'static mut SelectorWindowState> {
    let ptr = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(hwnd, GWLP_USERDATA)
        as *mut SelectorWindowState;
    ptr.as_mut()
}

fn invalidate_local_rect(hwnd: HWND, rect: Option<LocalSelectionRect>) {
    invalidate_selection_bounds(
        hwnd,
        rect.and_then(|rect| selection_bounds(rect.left, rect.top, rect.right, rect.bottom)),
    );
}

fn register_class() -> Result<(), String> {
    let mut result = Ok(());
    CLASS_REGISTERED.call_once(|| {
        let instance = match unsafe { GetModuleHandleW(None) } {
            Ok(value) => value,
            Err(err) => {
                result = Err(format!("GetModuleHandleW failed: {}", err));
                return;
            }
        };

        let cursor = match unsafe { LoadCursorW(None, IDC_CROSS) } {
            Ok(value) => value,
            Err(err) => {
                result = Err(format!("LoadCursorW failed: {}", err));
                return;
            }
        };

        let class = WNDCLASSW {
            lpfnWndProc: Some(window_proc),
            hInstance: instance.into(),
            hCursor: cursor,
            lpszClassName: WINDOW_CLASS,
            ..Default::default()
        };

        let atom = unsafe { RegisterClassW(&class) };
        if atom == 0 {
            result = Err("RegisterClassW failed".to_string());
        }
    });
    result
}

fn resolve_selector_surface_bounds(app: &AppHandle) -> SelectorSurfaceBounds {
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
        if let Some(primary) = monitors
            .into_iter()
            .find(|monitor| monitor.is_primary().unwrap_or(false))
        {
            return SelectorSurfaceBounds {
                x: primary.x().unwrap_or(0),
                y: primary.y().unwrap_or(0),
                w: primary.width().unwrap_or(1920) as i32,
                h: primary.height().unwrap_or(1080) as i32,
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

pub fn show_selector(app: &AppHandle) -> Result<SelectionOutcome, CaptureError> {
    register_class().map_err(|err| {
        log::error!(target: "capture::native_selector", "{}", err);
        CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "native_selector_register_failed",
            "Failed to register native region selector window.",
        )
    })?;

    // Check if another selector is already open
    {
        let guard = active_window_slot().lock().unwrap();
        if guard.is_some() {
            return Err(crate::capture::errors::CaptureError::Busy());
        }
    }

    run_native_selector(app.clone()).map_err(|err| {
        log::error!(target: "capture::native_selector", "{}", err);
        CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "native_selector_run_failed",
            &format!("Failed to run native region selector: {}", err),
        )
    })
}

fn run_native_selector(app: AppHandle) -> Result<SelectionOutcome, String> {
    let surface = resolve_selector_surface_bounds(&app);
    let virtual_x = surface.x;
    let virtual_y = surface.y;
    let virtual_w = surface.w;
    let virtual_h = surface.h;

    log::info!(
        target: "capture::native_selector",
        "opening native selector overlay: x={} y={} w={} h={}",
        virtual_x, virtual_y, virtual_w, virtual_h
    );

    let state = Box::new(SelectorWindowState {
        app,
        selection: SelectorState::new(virtual_x, virtual_y),
    });

    let module = unsafe { GetModuleHandleW(None).map_err(|err| err.to_string())? };
    let hwnd = unsafe {
        CreateWindowExW(
            WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
            WINDOW_CLASS,
            w!("XenSnip Region Selector"),
            WS_POPUP,
            virtual_x,
            virtual_y,
            virtual_w,
            virtual_h,
            None,
            None,
            Some(HINSTANCE(module.0)),
            Some(Box::into_raw(state) as *const _),
        )
    }
    .map_err(|err| err.to_string())?;

    {
        let mut guard = active_window_slot().lock().unwrap();
        *guard = Some(hwnd.0 as isize);
    }

    unsafe {
        let _ = SetLayeredWindowAttributes(hwnd, COLORREF(0), 140, LWA_ALPHA);
        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = UpdateWindow(hwnd);
        let _ = SetForegroundWindow(hwnd);
        let _ = SetFocus(Some(hwnd));
    }

    let mut msg = MSG::default();
    while unsafe { GetMessageW(&mut msg, None, 0, 0) }.into() {
        unsafe {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    Ok(LAST_OUTCOME.with(|cell| {
        let mut guard = cell.lock().unwrap();
        guard.take().unwrap_or(SelectionOutcome::Cancelled)
    }))
}

thread_local! {
    static LAST_OUTCOME: Mutex<Option<SelectionOutcome>> = Mutex::new(None);
}

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
        WM_ERASEBKGND => LRESULT(1),
        WM_LBUTTONDOWN => {
            if let Some(state) = state_mut(hwnd) {
                if !state.selection.is_selecting() {
                    let anchor = state
                        .selection
                        .begin_selection(get_x_lparam(lparam), get_y_lparam(lparam));
                    let _ = SetCapture(hwnd);
                    log::info!(
                        target: "capture::native_selector",
                        "native selector anchor set at {},{}",
                        anchor.gx,
                        anchor.gy
                    );
                } else {
                    let result = state
                        .selection
                        .finish_selection(get_x_lparam(lparam), get_y_lparam(lparam));
                    invalidate_local_rect(hwnd, result.old_rect);
                    invalidate_local_rect(hwnd, result.new_rect);
                    let _ = ReleaseCapture();

                    match result.outcome {
                        SelectionOutcome::Confirmed { gx, gy, gw, gh } => {
                            log::info!(target: "capture::native_selector", "native selector confirmed: {}x{} at {},{}", gw, gh, gx, gy);
                        }
                        SelectionOutcome::Cancelled => {
                            log::info!(target: "capture::native_selector", "native selector cancelled: rect too small");
                        }
                    }

                    let _ = DestroyWindow(hwnd);
                }
            }
            LRESULT(0)
        }
        WM_MOUSEMOVE => {
            if let Some(state) = state_mut(hwnd) {
                if state.selection.is_selecting() {
                    let preview = state
                        .selection
                        .update_selection(get_x_lparam(lparam), get_y_lparam(lparam));
                    invalidate_local_rect(hwnd, preview.old_rect);
                    invalidate_local_rect(hwnd, preview.new_rect);
                }
            }
            LRESULT(0)
        }
        WM_LBUTTONUP => LRESULT(0),
        WM_KEYDOWN => {
            if wparam.0 as u16 == VK_ESCAPE.0 {
                if let Some(state) = state_mut(hwnd) {
                    if state.selection.is_selecting() {
                        let _ = ReleaseCapture();
                    }
                    state.selection.cancel();
                }
                log::info!(target: "capture::native_selector", "native selector cancelled with Escape");
                let _ = DestroyWindow(hwnd);
                return LRESULT(0);
            }
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }
        windows::Win32::UI::WindowsAndMessaging::WM_PAINT => {
            let mut ps = PAINTSTRUCT::default();
            let hdc = BeginPaint(hwnd, &mut ps);
            let paint_w = ps.rcPaint.right - ps.rcPaint.left;
            let paint_h = ps.rcPaint.bottom - ps.rcPaint.top;

            if paint_w > 0 && paint_h > 0 {
                let mem_dc = CreateCompatibleDC(Some(hdc));
                if !mem_dc.0.is_null() {
                    let bitmap = CreateCompatibleBitmap(hdc, paint_w, paint_h);
                    if !bitmap.0.is_null() {
                        let bitmap_obj = HGDIOBJ(bitmap.0);
                        let old_bitmap = SelectObject(mem_dc, bitmap_obj);

                        let local_paint = RECT {
                            left: 0,
                            top: 0,
                            right: paint_w,
                            bottom: paint_h,
                        };
                        let _ =
                            FillRect(mem_dc, &local_paint, HBRUSH(GetStockObject(BLACK_BRUSH).0));

                        if let Some(state) = state_mut(hwnd) {
                            if let Some(rect) = state.selection.current_rect() {
                                let geometry =
                                    selection_paint_geometry(rect, ps.rcPaint.left, ps.rcPaint.top);

                                let pen = CreatePen(PS_SOLID, 2, COLORREF(0x00FFFFFF));
                                let old_pen = SelectObject(mem_dc, HGDIOBJ(pen.0));
                                let old_brush = SelectObject(mem_dc, GetStockObject(NULL_BRUSH));
                                let _ = Rectangle(
                                    mem_dc,
                                    geometry.rect.left,
                                    geometry.rect.top,
                                    geometry.rect.right,
                                    geometry.rect.bottom,
                                );

                                let label_u16: Vec<u16> = geometry.label.encode_utf16().collect();
                                let _ = SetBkMode(mem_dc, TRANSPARENT);
                                let _ = SetTextColor(mem_dc, COLORREF(0x00FFFFFF));
                                let _ = TextOutW(
                                    mem_dc,
                                    geometry.label_x,
                                    geometry.label_y,
                                    &label_u16,
                                );

                                let _ = SelectObject(mem_dc, old_pen);
                                let _ = SelectObject(mem_dc, old_brush);
                                let _ = DeleteObject(HGDIOBJ(pen.0));
                            }
                        }

                        let _ = BitBlt(
                            hdc,
                            ps.rcPaint.left,
                            ps.rcPaint.top,
                            paint_w,
                            paint_h,
                            Some(mem_dc),
                            0,
                            0,
                            SRCCOPY,
                        );

                        let _ = SelectObject(mem_dc, old_bitmap);
                        let _ = DeleteObject(bitmap_obj);
                    }
                    let _ = DeleteDC(mem_dc);
                }
            }

            let _ = EndPaint(hwnd, &ps);
            LRESULT(0)
        }
        WM_DESTROY => {
            {
                let mut guard = active_window_slot().lock().unwrap();
                *guard = None;
            }

            let ptr =
                windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(hwnd, GWLP_USERDATA)
                    as *mut SelectorWindowState;
            if !ptr.is_null() {
                let state = Box::from_raw(ptr);
                if state.selection.is_selecting() {
                    let _ = ReleaseCapture();
                }

                LAST_OUTCOME.with(|cell| {
                    let mut guard = cell.lock().unwrap();
                    *guard = Some(state.selection.outcome().clone());
                });

                if let SelectionOutcome::Cancelled = state.selection.outcome() {
                    finish_session(&state.app);
                }
            }

            PostQuitMessage(0);
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}
