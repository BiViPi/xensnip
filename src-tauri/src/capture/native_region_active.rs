use std::sync::{Mutex, OnceLock};
use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{PostMessageW, WM_CLOSE};

static ACTIVE_WINDOW: OnceLock<Mutex<Option<isize>>> = OnceLock::new();

pub(super) fn active_window_slot() -> &'static Mutex<Option<isize>> {
    ACTIVE_WINDOW.get_or_init(|| Mutex::new(None))
}

/// Sends WM_CLOSE to the active region selector overlay, if one is open.
pub fn close_active() {
    let hwnd = {
        let guard = active_window_slot().lock().unwrap();
        guard.map(|raw| HWND(raw as *mut core::ffi::c_void))
    };

    if let Some(hwnd) = hwnd {
        let _ = unsafe { PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)) };
    }
}
