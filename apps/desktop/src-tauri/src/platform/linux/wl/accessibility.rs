use std::{thread, time::Duration};

pub fn get_selected_text() -> Option<String> {
    let previous = super::input::clipboard_get().ok();

    super::input::simulate_copy_keystroke().ok()?;
    thread::sleep(Duration::from_millis(50));

    let selected = super::input::clipboard_get().ok();

    if let Some(old) = previous {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(100));
            let _ = super::input::clipboard_set(&old);
        });
    }

    selected.filter(|s| !s.is_empty())
}
