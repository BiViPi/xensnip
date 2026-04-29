use xcap::Window;

fn main() {
    let windows = Window::all().unwrap();
    if let Some(window) = windows.first() {
        println!("Window: id={}, title={}, x={}, y={}, w={}, h={}", 
            window.id().unwrap_or(0), window.title().unwrap_or_default(), window.x().unwrap_or(0), window.y().unwrap_or(0), window.width().unwrap_or(0), window.height().unwrap_or(0));
    } else {
        println!("No windows found");
    }
}
