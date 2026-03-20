pub fn configure_display_backend() {
    if std::env::var("GDK_BACKEND").is_ok() {
        return;
    }
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        std::env::set_var("GDK_BACKEND", "wayland");
    }
}
