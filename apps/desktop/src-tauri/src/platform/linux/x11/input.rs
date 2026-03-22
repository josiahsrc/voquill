use enigo::{Enigo, Key, KeyboardControllable};
use std::{thread, time::Duration};

pub fn paste_text(text: &str, _keybind: Option<&str>) -> Result<(), String> {
    paste_via_clipboard(text).or_else(|err| {
        log::warn!("Clipboard paste failed ({err}), falling back to simulated typing");
        enigo_type_text(text)
    })
}

fn enigo_type_text(text: &str) -> Result<(), String> {
    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));
    enigo.key_sequence(text);
    Ok(())
}

fn paste_via_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = crate::platform::SavedClipboard::save(&mut clipboard);
    clipboard
        .set_text(text.to_string())
        .map_err(|err| format!("failed to store clipboard text: {err}"))?;

    thread::sleep(Duration::from_millis(40));

    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));

    enigo.key_down(Key::Control);
    enigo.key_down(Key::Shift);
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('v'));
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(800));
        previous.restore();
    });

    Ok(())
}
