pub fn init_x11_threads() {
    if !super::detect::is_wayland() {
        super::x11::init::init_x11_threads();
    }
}

pub fn configure_display_backend() {
    if super::detect::is_wayland() {
        super::wl::init::configure_display_backend();
    }
}
