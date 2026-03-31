pub fn init_x11_threads() {}

pub fn configure_display_backend() {}

pub fn get_native_setup_status() -> crate::platform::NativeSetupStatus {
    crate::platform::NativeSetupStatus::Ready
}

pub async fn run_native_setup() -> crate::platform::NativeSetupResult {
    crate::platform::NativeSetupResult::Success
}

pub fn ensure_background_services() {}
