use crate::platform::{NativeSetupResult, NativeSetupStatus};

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

pub fn get_native_setup_status() -> NativeSetupStatus {
    if super::detect::is_wayland() {
        super::wl::setup::get_native_setup_status()
    } else {
        NativeSetupStatus::Ready
    }
}

pub async fn run_native_setup() -> NativeSetupResult {
    if super::detect::is_wayland() {
        super::wl::setup::run_native_setup().await
    } else {
        NativeSetupResult::Success
    }
}
