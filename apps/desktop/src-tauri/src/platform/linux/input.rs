pub(crate) fn paste_text_into_focused_field(
    text: &str,
    keybind: Option<&str>,
) -> Result<(), String> {
    if text.trim().is_empty() {
        return Ok(());
    }

    let override_text = std::env::var("VOQUILL_DEBUG_PASTE_TEXT").ok();
    let target = override_text.as_deref().unwrap_or(text);
    log::info!(
        "attempting to inject text ({} chars)",
        target.chars().count()
    );

    if super::detect::is_wayland() {
        log::info!("Wayland session detected");
        super::wl::input::paste_text(target, keybind)
    } else {
        super::x11::input::paste_text(target, keybind)
    }
}

pub(crate) fn warm_runtime_helpers() {
    if super::detect::is_wayland() {
        super::wl::input::warm_runtime_helpers();
    }
}
