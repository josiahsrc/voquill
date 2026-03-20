/// Initialize X11 threading support.
///
/// This MUST be called before any X11 operations from any thread.
/// The application uses multiple threads that interact with X11:
/// - Tauri/GTK for the GUI
/// - rdev for global keyboard listening
/// - CPAL/ALSA for audio capture
///
/// Without XInitThreads, concurrent X11 access causes crashes.
pub fn init_x11_threads() {
    unsafe {
        x11::xlib::XInitThreads();
    }
}

/// Configure the display backend for GTK.
///
/// On Wayland sessions, GTK may try X11 first and fail if Xwayland auth
/// isn't available. Explicitly selecting the Wayland backend prevents this.
pub fn configure_display_backend() {
    if std::env::var("GDK_BACKEND").is_ok() {
        return;
    }
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        std::env::set_var("GDK_BACKEND", "wayland");
    }
}
