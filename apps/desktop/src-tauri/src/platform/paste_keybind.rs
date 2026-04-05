#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PasteKeystroke {
    CtrlV,
    CtrlShiftV,
    ShiftInsert,
}

pub fn parse_paste_keystroke(keybind: Option<&str>) -> PasteKeystroke {
    match keybind {
        Some("ctrl+shift+v") => PasteKeystroke::CtrlShiftV,
        Some("shift+insert") => PasteKeystroke::ShiftInsert,
        _ => PasteKeystroke::CtrlV,
    }
}
