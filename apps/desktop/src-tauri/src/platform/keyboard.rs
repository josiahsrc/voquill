use rdev::{Event, EventType, Key as RdevKey};
use std::env;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, Once, OnceLock};
use std::thread;
use std::time::SystemTime;

use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;

type Handler = Arc<Mutex<Box<dyn FnMut(&Event) + Send + 'static>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
enum WireEventKind {
    Press,
    Release,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct KeyboardEventPayload {
    kind: WireEventKind,
    key_label: String,
    raw_code: Option<u32>,
}

fn handler_store() -> Arc<Mutex<Vec<Handler>>> {
    static HANDLERS: OnceLock<Arc<Mutex<Vec<Handler>>>> = OnceLock::new();
    HANDLERS
        .get_or_init(|| Arc::new(Mutex::new(Vec::new())))
        .clone()
}

fn debug_keys_enabled() -> bool {
    static DEBUG: OnceLock<bool> = OnceLock::new();
    *DEBUG.get_or_init(|| matches!(env::var("VOQUILL_DEBUG_KEYS"), Ok(value) if value == "1"))
}

fn child_store() -> &'static Mutex<Option<Child>> {
    static CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
    CHILD.get_or_init(|| Mutex::new(None))
}

fn start_in_process_listener(handlers: Arc<Mutex<Vec<Handler>>>) {
    thread::spawn(move || {
        if let Err(err) = rdev::listen(move |event| dispatch_event(&handlers, &event)) {
            eprintln!("Failed to listen for global key events in-process: {err:?}");
        }
    });
}

fn dispatch_event(handlers: &Arc<Mutex<Vec<Handler>>>, event: &Event) {
    if debug_keys_enabled() {
        eprintln!("[keys] event: {:?}", event.event_type);
    }

    let registered = {
        let guard = handlers
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.clone()
    };

    for handler in registered {
        if let Ok(mut callback) = handler.lock() {
            (callback)(event);
        }
    }
}

fn start_external_listener(handlers: Arc<Mutex<Vec<Handler>>>) -> Result<(), String> {
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|err| format!("failed to bind keyboard listener socket: {err}"))?;
    let port = listener
        .local_addr()
        .map_err(|err| format!("failed to read listener address: {err}"))?
        .port();

    let listener_handlers = handlers.clone();
    thread::spawn(move || loop {
        if let Err(err) = ensure_listener_child(port) {
            eprintln!("Keyboard listener child error: {err}");
            std::thread::sleep(std::time::Duration::from_millis(500));
            continue;
        }

        match listener.accept() {
            Ok((stream, _addr)) => {
                if let Err(err) = pump_stream(stream, listener_handlers.clone()) {
                    eprintln!("Keyboard listener stream error: {err}");
                }
            }
            Err(err) => {
                eprintln!("Keyboard listener accept error: {err}");
                std::thread::sleep(std::time::Duration::from_millis(200));
            }
        }
    });

    Ok(())
}

fn spawn_listener_child(port: u16) -> Result<Child, String> {
    let exe = std::env::current_exe()
        .map_err(|err| format!("failed to resolve current executable: {err}"))?;

    let mut command = Command::new(exe);
    command
        .env("VOQUILL_KEYBOARD_LISTENER", "1")
        .env("VOQUILL_KEYBOARD_PORT", port.to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command
        .spawn()
        .map_err(|err| format!("failed to spawn keyboard listener process: {err}"))
}

fn ensure_listener_child(port: u16) -> Result<(), String> {
    let should_spawn = {
        let mut guard = child_store()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        if let Some(child) = guard.as_mut() {
            match child.try_wait() {
                Ok(Some(_status)) => {
                    *guard = None;
                    true
                }
                Ok(None) => {
                    return Ok(());
                }
                Err(err) => {
                    eprintln!("Keyboard listener child wait failed: {err}");
                    *guard = None;
                    true
                }
            }
        } else {
            true
        }
    };

    if !should_spawn {
        return Ok(());
    }

    let child = spawn_listener_child(port)?;
    let mut guard = child_store()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    *guard = Some(child);
    Ok(())
}

fn pump_stream(stream: TcpStream, handlers: Arc<Mutex<Vec<Handler>>>) -> Result<(), String> {
    stream
        .set_nodelay(true)
        .map_err(|err| format!("failed to configure keyboard stream: {err}"))?;

    let reader = BufReader::new(stream);
    let lines = reader.lines();
    for line in lines {
        let line = line.map_err(|err| format!("failed to read keyboard event: {err}"))?;
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<KeyboardEventPayload>(&line) {
            Ok(payload) => {
                if let Some(event) = event_from_payload(payload) {
                    dispatch_event(&handlers, &event);
                }
            }
            Err(err) => eprintln!("Malformed keyboard event payload: {err}: {line}"),
        }
    }

    Ok(())
}

fn event_from_payload(payload: KeyboardEventPayload) -> Option<Event> {
    let key = key_from_payload(&payload.key_label, payload.raw_code)?;

    let event_type = match payload.kind {
        WireEventKind::Press => EventType::KeyPress(key),
        WireEventKind::Release => EventType::KeyRelease(key),
    };

    Some(Event {
        time: SystemTime::now(),
        unicode: None,
        event_type,
        platform_code: 0,
        position_code: 0,
        usb_hid: 0,
        #[cfg(target_os = "windows")]
        extra_data: 0,
        #[cfg(target_os = "macos")]
        extra_data: 0,
    })
}

fn key_from_payload(label: &str, raw_code: Option<u32>) -> Option<RdevKey> {
    if let Some(code) = raw_code.or_else(|| parse_unknown_label(label)) {
        return Some(RdevKey::Unknown(code));
    }

    for key in RdevKey::iter() {
        match key {
            RdevKey::Unknown(_) | RdevKey::RawKey(_) => continue,
            _ => {
                if format!("{key:?}") == label {
                    return Some(key);
                }
            }
        }
    }

    None
}

fn parse_unknown_label(label: &str) -> Option<u32> {
    let trimmed = label.strip_prefix("Unknown(")?.strip_suffix(')')?;
    trimmed.parse().ok()
}

fn key_to_label(key: RdevKey) -> String {
    match key {
        RdevKey::Unknown(code) => format!("Unknown({code})"),
        _ => format!("{key:?}"),
    }
}

fn key_raw_code(key: RdevKey) -> Option<u32> {
    match key {
        RdevKey::Unknown(code) => Some(code),
        _ => None,
    }
}

pub(crate) fn register_handler<F>(handler: F)
where
    F: FnMut(&Event) + Send + 'static,
{
    let handler: Handler = Arc::new(Mutex::new(Box::new(handler)));
    let handlers = handler_store();
    {
        let mut guard = handlers
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.push(handler);
    }

    static START_LISTENER: Once = Once::new();
    START_LISTENER.call_once(|| {
        let handlers = handler_store();
        if let Err(err) = start_external_listener(handlers.clone()) {
            eprintln!("Falling back to in-process keyboard listener: {err}");
            start_in_process_listener(handlers);
        }
    });
}

pub fn run_listener_process() -> Result<(), String> {
    let port = env::var("VOQUILL_KEYBOARD_PORT")
        .map_err(|_| "VOQUILL_KEYBOARD_PORT env var missing".to_string())?
        .parse::<u16>()
        .map_err(|err| format!("invalid VOQUILL_KEYBOARD_PORT: {err}"))?;

    let stream = TcpStream::connect(("127.0.0.1", port))
        .map_err(|err| format!("keyboard listener failed to connect: {err}"))?;
    stream
        .set_nodelay(true)
        .map_err(|err| format!("failed to configure listener socket: {err}"))?;

    let writer = Arc::new(Mutex::new(BufWriter::new(stream)));

    let result = rdev::listen({
        let writer = writer.clone();
        move |event| {
            let payload = match event.event_type {
                EventType::KeyPress(key) => Some(KeyboardEventPayload {
                    kind: WireEventKind::Press,
                    key_label: key_to_label(key),
                    raw_code: key_raw_code(key),
                }),
                EventType::KeyRelease(key) => Some(KeyboardEventPayload {
                    kind: WireEventKind::Release,
                    key_label: key_to_label(key),
                    raw_code: key_raw_code(key),
                }),
                _ => None,
            };

            if let Some(payload) = payload {
                if let Ok(json) = serde_json::to_string(&payload) {
                    if let Ok(mut guard) = writer.lock() {
                        if let Err(err) = writeln!(guard, "{json}") {
                            eprintln!("Keyboard listener write error: {err}");
                            std::process::exit(1);
                        }
                        if let Err(err) = guard.flush() {
                            eprintln!("Keyboard listener flush error: {err}");
                            std::process::exit(1);
                        }
                    }
                }
            }
        }
    });

    result.map_err(|err| format!("keyboard listener error: {err:?}"))
}
