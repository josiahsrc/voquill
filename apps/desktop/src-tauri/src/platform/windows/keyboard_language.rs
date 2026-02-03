#[link(name = "user32")]
extern "system" {
    fn GetKeyboardLayout(idThread: u32) -> isize;
}

pub fn get_keyboard_language() -> Result<String, String> {
    let hkl = unsafe { GetKeyboardLayout(0) };
    let lang_id = (hkl as u16) & 0x3FF;

    let code = match lang_id {
        0x09 => "en",
        0x0C => "fr",
        0x07 => "de",
        0x0A => "es",
        0x10 => "it",
        0x16 => "pt",
        0x19 => "ru",
        0x11 => "ja",
        0x04 => "zh",
        0x12 => "ko",
        0x1F => "tr",
        0x15 => "pl",
        0x13 => "nl",
        0x01 => "ar",
        0x1D => "sv",
        0x21 => "id",
        0x39 => "hi",
        0x0B => "fi",
        0x2A => "vi",
        0x0D => "he",
        0x22 => "uk",
        0x08 => "el",
        0x05 => "cs",
        0x18 => "ro",
        0x06 => "da",
        0x0E => "hu",
        0x14 => "no",
        0x1E => "th",
        0x20 => "ur",
        0x1A => "hr",
        0x02 => "bg",
        0x27 => "lt",
        0x1B => "sk",
        0x29 => "fa",
        0x26 => "lv",
        0x45 => "bn",
        0x1C => "sq",
        0x41 => "sw",
        0x03 => "ca",
        _ => "en",
    };

    Ok(code.to_string())
}
