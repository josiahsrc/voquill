// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(target_os = "macos")]
fn spawn_alt_listener(app: &tauri::AppHandle) -> tauri::Result<()> {
    use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
    use core_graphics::event::{
        CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement,
        CGEventType, EventField,
    };
    use serde::Serialize;
    use std::sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc,
    };
    use tauri::{Emitter, EventTarget};

    #[derive(Clone, Serialize)]
    struct AltEventPayload {
        count: u64,
    }

    const LEFT_OPTION_KEYCODE: i64 = 58;
    const RIGHT_OPTION_KEYCODE: i64 = 61;

    let app_handle = app.clone();

    std::thread::spawn(move || {
        let press_counter = Arc::new(AtomicU64::new(0));
        let is_alt_pressed = Arc::new(AtomicBool::new(false));
        let emit_handle = app_handle.clone();

        let event_tap = match CGEventTap::new(
            CGEventTapLocation::Session,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::ListenOnly,
            vec![CGEventType::FlagsChanged, CGEventType::KeyDown],
            {
                let counter = press_counter.clone();
                let alt_state = is_alt_pressed.clone();
                move |_proxy, event_type, event| {
                    let keycode =
                        event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
                    if keycode == LEFT_OPTION_KEYCODE || keycode == RIGHT_OPTION_KEYCODE {
                        #[cfg(debug_assertions)]
                        {
                            eprintln!(
                                "[alt-listener] event_type={:?} keycode={} flags={:?}",
                                event_type,
                                keycode,
                                event.get_flags()
                            );
                        }
                        let maybe_pressed = match event_type {
                            CGEventType::FlagsChanged => Some(
                                event
                                    .get_flags()
                                    .contains(CGEventFlags::CGEventFlagAlternate),
                            ),
                            CGEventType::KeyDown => Some(true),
                            _ => None,
                        };
                        #[cfg(debug_assertions)]
                        {
                            if let Some(pressed) = maybe_pressed {
                                eprintln!("[alt-listener] alt pressed={pressed}");
                            }
                        }

                        if let Some(currently_pressed) = maybe_pressed {
                            let was_pressed = alt_state.swap(currently_pressed, Ordering::SeqCst);
                            #[cfg(debug_assertions)]
                            {
                                eprintln!(
                                    "[alt-listener] was_pressed={} currently_pressed={}",
                                    was_pressed, currently_pressed
                                );
                            }

                            if currently_pressed && !was_pressed {
                                let new_count = counter.fetch_add(1, Ordering::SeqCst) + 1;
                                let payload = AltEventPayload { count: new_count };
                                #[cfg(debug_assertions)]
                                {
                                    eprintln!(
                                        "[alt-listener] emitting alt-pressed event: count={}",
                                        new_count
                                    );
                                }
                                if let Err(emit_err) = emit_handle.emit_to(
                                    EventTarget::any(),
                                    "alt-pressed",
                                    payload,
                                ) {
                                    eprintln!("Failed to emit alt-pressed event: {emit_err}");
                                }
                            }
                        }
                    }

                    None
                }
            },
        ) {
            Ok(tap) => tap,
            Err(_) => {
                eprintln!("Failed to create global Alt key event tap");
                return;
            }
        };

        let run_loop_source = match event_tap.mach_port.create_runloop_source(0) {
            Ok(source) => source,
            Err(_) => {
                eprintln!("Failed to create run loop source for Alt key listener");
                return;
            }
        };

        let current_loop = CFRunLoop::get_current();
        current_loop.add_source(&run_loop_source, unsafe { kCFRunLoopCommonModes });
        event_tap.enable();
        CFRunLoop::run_current();
    });

    Ok(())
}

#[cfg(desktop)]
fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let icon = app.default_window_icon().cloned();

    let open_item = MenuItem::with_id(app, "atari-open", "Open Atari", true, None::<&str>)?;
    let placeholder_item =
        MenuItem::with_id(app, "atari-placeholder", "More Options", true, None::<&str>)?;

    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .item(&placeholder_item)
        .build()?;

    let mut tray_builder = TrayIconBuilder::new().menu(&menu).tooltip("Atari");

    if let Some(icon) = icon {
        #[cfg(target_os = "macos")]
        {
            tray_builder = tray_builder.icon(icon).icon_as_template(true);
        }
        #[cfg(not(target_os = "macos"))]
        {
            tray_builder = tray_builder.icon(icon);
        }
    }

    let _tray_icon = tray_builder.build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let updater_builder = match std::env::var("TAURI_UPDATER_PUBLIC_KEY") {
        Ok(pubkey) if !pubkey.trim().is_empty() => {
            tauri_plugin_updater::Builder::new().pubkey(pubkey)
        }
        _ => tauri_plugin_updater::Builder::new(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(updater_builder.build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                setup_tray(app).map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }
            #[cfg(target_os = "macos")]
            {
                spawn_alt_listener(&app.handle())
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
