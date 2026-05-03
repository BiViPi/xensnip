use crate::capture::errors::CaptureError;
use std::sync::{Mutex, Once, OnceLock};
use std::thread;
use tauri::{AppHandle, Manager};
use windows::core::w;
use windows::Win32::Foundation::{COLORREF, HINSTANCE, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    BeginPaint, CreatePen, DeleteObject, EndPaint, FillRect, GetStockObject, InvalidateRect,
    SelectObject, UpdateWindow, BLACK_BRUSH, HBRUSH, HGDIOBJ, NULL_BRUSH, PAINTSTRUCT, PS_SOLID,
    Rectangle,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    ReleaseCapture, SetCapture, SetFocus, VK_ESCAPE,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetMessageW, GetSystemMetrics,
    GetClientRect, LoadCursorW, PostMessageW, PostQuitMessage, RegisterClassW, SetForegroundWindow,
    SetLayeredWindowAttributes, ShowWindow, TranslateMessage, CREATESTRUCTW, CS_HREDRAW,
    CS_VREDRAW, GWLP_USERDATA, IDC_CROSS, LWA_ALPHA, MSG, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
    SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SW_SHOW, WM_CLOSE, WM_DESTROY, WM_ERASEBKGND,
    WM_KEYDOWN, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MOUSEMOVE, WM_NCCREATE, WNDCLASSW,
    WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_POPUP,
};

const WINDOW_CLASS: windows::core::PCWSTR = w!("XenSnipNativeRegionSpike");

struct SpikeWindowState {
    app: AppHandle,
    virtual_x: i32,
    virtual_y: i32,
    dragging: bool,
    start_x: i32,
    start_y: i32,
    current_x: i32,
    current_y: i32,
}

static CLASS_REGISTERED: Once = Once::new();
static ACTIVE_WINDOW: OnceLock<Mutex<Option<isize>>> = OnceLock::new();

fn active_window_slot() -> &'static Mutex<Option<isize>> {
    ACTIVE_WINDOW.get_or_init(|| Mutex::new(None))
}

fn finish_session(app: &AppHandle) {
    if let Some(session) = app.try_state::<crate::capture::CaptureSession>() {
        session.finish();
    }
}

fn get_x_lparam(lparam: LPARAM) -> i32 {
    (lparam.0 as i16) as i32
}

fn get_y_lparam(lparam: LPARAM) -> i32 {
    ((lparam.0 >> 16) as i16) as i32
}

unsafe fn state_mut(hwnd: HWND) -> Option<&'static mut SpikeWindowState> {
    let ptr = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(hwnd, GWLP_USERDATA)
        as *mut SpikeWindowState;
    ptr.as_mut()
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
            style: CS_HREDRAW | CS_VREDRAW,
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

pub fn close_active() {
    let hwnd = {
        let guard = active_window_slot().lock().unwrap();
        guard.map(|raw| HWND(raw as *mut core::ffi::c_void))
    };

    if let Some(hwnd) = hwnd {
        let _ = unsafe { PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)) };
    }
}

pub fn show_virtual_screen_selector(app: &AppHandle) -> Result<(), CaptureError> {
    register_class().map_err(|err| {
        log::error!(target: "capture::native_region_spike", "{}", err);
        CaptureError::new(
            crate::capture::errors::CaptureErrorClass::Other,
            "native_spike_register_failed",
            "Failed to register native region spike window.",
        )
    })?;

    let app_handle = app.clone();
    thread::spawn(move || {
        if let Err(err) = run_native_region_spike(app_handle.clone()) {
            log::error!(target: "capture::native_region_spike", "{}", err);
            finish_session(&app_handle);
        }
    });

    Ok(())
}

fn run_native_region_spike(app: AppHandle) -> Result<(), String> {
    let virtual_x = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
    let virtual_y = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
    let virtual_w = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
    let virtual_h = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };

    log::info!(
        target: "capture::native_region_spike",
        "opening native spike overlay: x={} y={} w={} h={}",
        virtual_x,
        virtual_y,
        virtual_w,
        virtual_h
    );

    let state = Box::new(SpikeWindowState {
        app,
        virtual_x,
        virtual_y,
        dragging: false,
        start_x: 0,
        start_y: 0,
        current_x: 0,
        current_y: 0,
    });

    let module = unsafe { GetModuleHandleW(None).map_err(|err| err.to_string())? };
    let hwnd = unsafe {
        CreateWindowExW(
            WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
            WINDOW_CLASS,
            w!("XenSnip Native Region Spike"),
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
        SetLayeredWindowAttributes(hwnd, COLORREF(0), 140, LWA_ALPHA).map_err(|err| err.to_string())?;
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

    Ok(())
}

unsafe extern "system" fn window_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    match msg {
        WM_NCCREATE => {
            let create = &*(lparam.0 as *const CREATESTRUCTW);
            let ptr = create.lpCreateParams as *mut SpikeWindowState;
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
                state.dragging = true;
                state.start_x = get_x_lparam(lparam);
                state.start_y = get_y_lparam(lparam);
                state.current_x = state.start_x;
                state.current_y = state.start_y;
                let _ = SetCapture(hwnd);
                let _ = InvalidateRect(Some(hwnd), None, true);
            }
            LRESULT(0)
        }
        WM_MOUSEMOVE => {
            if let Some(state) = state_mut(hwnd) {
                if state.dragging {
                    state.current_x = get_x_lparam(lparam);
                    state.current_y = get_y_lparam(lparam);
                    let _ = InvalidateRect(Some(hwnd), None, true);
                }
            }
            LRESULT(0)
        }
        WM_LBUTTONUP => {
            if let Some(state) = state_mut(hwnd) {
                if state.dragging {
                    state.dragging = false;
                    state.current_x = get_x_lparam(lparam);
                    state.current_y = get_y_lparam(lparam);
                    let _ = ReleaseCapture();

                    let gx = state.virtual_x + state.start_x.min(state.current_x);
                    let gy = state.virtual_y + state.start_y.min(state.current_y);
                    let gw = (state.current_x - state.start_x).unsigned_abs();
                    let gh = (state.current_y - state.start_y).unsigned_abs();

                    log::info!(
                        target: "capture::native_region_spike",
                        "native spike rect: gx={} gy={} gw={} gh={}",
                        gx,
                        gy,
                        gw,
                        gh
                    );
                }
            }
            let _ = DestroyWindow(hwnd);
            LRESULT(0)
        }
        WM_KEYDOWN => {
            if wparam.0 as u16 == VK_ESCAPE.0 {
                log::info!(target: "capture::native_region_spike", "native spike cancelled with Escape");
                let _ = DestroyWindow(hwnd);
                return LRESULT(0);
            }
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }
        windows::Win32::UI::WindowsAndMessaging::WM_PAINT => {
            let mut ps = PAINTSTRUCT::default();
            let hdc = BeginPaint(hwnd, &mut ps);

            let mut client = RECT::default();
            let _ = GetClientRect(hwnd, &mut client);
            let _ = FillRect(hdc, &client, HBRUSH(GetStockObject(BLACK_BRUSH).0));

            if let Some(state) = state_mut(hwnd) {
                let left = state.start_x.min(state.current_x);
                let top = state.start_y.min(state.current_y);
                let right = state.start_x.max(state.current_x);
                let bottom = state.start_y.max(state.current_y);

                if right > left && bottom > top {
                    let pen = CreatePen(PS_SOLID, 2, COLORREF(0x00FFFFFF));
                    let old_pen = SelectObject(hdc, HGDIOBJ(pen.0));
                    let old_brush = SelectObject(hdc, GetStockObject(NULL_BRUSH));
                    let _ = Rectangle(hdc, left, top, right, bottom);
                    let _ = SelectObject(hdc, old_pen);
                    let _ = SelectObject(hdc, old_brush);
                    let _ = DeleteObject(HGDIOBJ(pen.0));
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

            let ptr = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(hwnd, GWLP_USERDATA)
                as *mut SpikeWindowState;
            if !ptr.is_null() {
                let state = Box::from_raw(ptr);
                finish_session(&state.app);
            }

            PostQuitMessage(0);
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}
