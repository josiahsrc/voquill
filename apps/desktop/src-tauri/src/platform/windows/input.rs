use crate::domain::TextSelection;
use enigo::{Enigo, Key, KeyboardControllable};
use std::{env, thread, time::Duration};
use windows::{
    core::BSTR,
    Win32::{
        System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED},
        UI::Accessibility::{
            CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_TextPatternId,
        },
    },
};

pub(crate) fn get_text_selection() -> Result<TextSelection, String> {
    unsafe {
        let coinit_result = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let should_uninit = coinit_result.is_ok();

        let result = get_text_selection_inner();

        if should_uninit {
            CoUninitialize();
        }

        result
    }
}

unsafe fn get_text_selection_inner() -> Result<TextSelection, String> {
    let automation: IUIAutomation = windows::core::ComInterface::cast(
        &windows::Win32::System::Com::CoCreateInstance::<_, IUIAutomation>(
            &CUIAutomation,
            None,
            windows::Win32::System::Com::CLSCTX_INPROC_SERVER,
        )
        .map_err(|e| format!("Failed to create UI Automation: {}", e))?,
    )
    .map_err(|e| format!("Failed to cast UI Automation: {}", e))?;

    let focused_element = automation
        .GetFocusedElement()
        .map_err(|e| format!("Failed to get focused element: {}", e))?;

    let text_pattern_variant = focused_element
        .GetCurrentPattern(UIA_TextPatternId)
        .map_err(|_| "Focused element does not support text pattern")?;

    let text_pattern: IUIAutomationTextPattern =
        windows::core::ComInterface::cast(&text_pattern_variant)
            .map_err(|_| "Failed to cast to text pattern")?;

    let document_range = text_pattern
        .DocumentRange()
        .map_err(|_| "Failed to get document range")?;

    let full_text_bstr: BSTR = document_range
        .GetText(-1)
        .map_err(|_| "Failed to get full text")?;

    let full_text = full_text_bstr.to_string();

    let selection_ranges = text_pattern
        .GetSelection()
        .map_err(|_| "Failed to get selection")?;

    let range_count = selection_ranges
        .Length()
        .map_err(|_| "Failed to get selection length")?;

    if range_count == 0 {
        return Ok(TextSelection::new(full_text, String::new(), 0, 0));
    }

    let range = selection_ranges
        .GetElement(0)
        .map_err(|_| "Failed to get selection range")?;

    let selected_text_bstr: BSTR = range
        .GetText(-1)
        .map_err(|_| "Failed to get selected text")?;

    let selected_text = selected_text_bstr.to_string();
    let length = selected_text.chars().count();

    Ok(TextSelection::new(full_text, selected_text, 0, length))
}

pub(crate) fn paste_text_into_focused_field(text: &str) -> Result<(), String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    let override_text = env::var("VOQUILL_DEBUG_PASTE_TEXT").ok();
    let target = override_text.as_deref().unwrap_or(trimmed);
    eprintln!(
        "[voquill] attempting to inject text ({} chars)",
        target.chars().count()
    );

    paste_via_clipboard(target).or_else(|err| {
        eprintln!("Clipboard paste failed ({err}). Falling back to simulated typing.");
        let mut enigo = Enigo::new();
        enigo.key_up(Key::Shift);
        enigo.key_up(Key::Control);
        enigo.key_up(Key::Alt);
        thread::sleep(Duration::from_millis(30));
        enigo.key_sequence(target);
        Ok(())
    })
}

fn paste_via_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|err| format!("clipboard unavailable: {err}"))?;
    let previous = clipboard.get_text().ok();
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
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('v'));
    enigo.key_up(Key::Control);

    if let Some(old) = previous {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(800));
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                let _ = clipboard.set_text(old);
            }
        });
    }

    Ok(())
}
