use crate::domain::{KeysHeldPayload, EVT_KEYS_HELD};
use rdev::{Event, EventType, Key as RdevKey};
use std::cell::RefCell;
use std::collections::HashSet;
use std::env;
use std::io::{BufRead, BufReader, BufWriter, ErrorKind, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter, EventTarget};

use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;

type PressedKeys = Arc<Mutex<HashSet<String>>>;

struct KeyEventEmitter {
    app: AppHandle,
    pressed_keys: PressedKeys,
}
impl KeyEventEmitter {
    fn new(app: &AppHandle) -> Self {
        Self {
            app: app.clone(),
            pressed_keys: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    fn handle_event(&self, event: &Event) {
        if debug_keys_enabled() {
            eprintln!("[keys] event: {:?}", event.event_type);
        }

        match event.event_type {
            EventType::KeyPress(key) => {
                self.update_pressed_keys(key, true);
            }
            EventType::KeyRelease(key) => {
                self.update_pressed_keys(key, false);
            }
            _ => {}
        }
    }

    fn update_pressed_keys(&self, key: RdevKey, is_pressed: bool) {
        let key_label = key_to_label(key);
        let mut guard = self
            .pressed_keys
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        let changed = if is_pressed {
            guard.insert(key_label.clone())
        } else {
            guard.remove(&key_label)
        };

        if changed {
            let mut snapshot: Vec<String> = guard.iter().cloned().collect();
            snapshot.sort_unstable();
            drop(guard);
            self.emit(keys_payload(snapshot));
        }
    }

    fn reset(&self) {
        let mut guard = self
            .pressed_keys
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.clear();
        drop(guard);
        self.emit(keys_payload(Vec::new()));
    }

    fn emit(&self, payload: KeysHeldPayload) {
        if let Err(err) = self.app.emit_to(EventTarget::any(), EVT_KEYS_HELD, payload) {
            eprintln!("Failed to emit keys-held event: {err}");
        }
    }
}

struct ListenerHandle {
    join_handle: JoinHandle<()>,
    running: Arc<AtomicBool>,
    emitter: Arc<KeyEventEmitter>,
}

fn listener_state() -> &'static Mutex<Option<ListenerHandle>> {
    static STATE: OnceLock<Mutex<Option<ListenerHandle>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(None))
}

fn keys_payload(keys: Vec<String>) -> KeysHeldPayload {
    KeysHeldPayload { keys }
}

fn combo_store() -> &'static Mutex<Vec<Vec<String>>> {
    static STORE: OnceLock<Mutex<Vec<Vec<String>>>> = OnceLock::new();
    STORE.get_or_init(|| Mutex::new(Vec::new()))
}

fn child_stdin_store() -> &'static Mutex<Option<ChildStdin>> {
    static STORE: OnceLock<Mutex<Option<ChildStdin>>> = OnceLock::new();
    STORE.get_or_init(|| Mutex::new(None))
}

pub fn sync_combos(combos: Vec<Vec<String>>) {
    {
        let mut guard = combo_store()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        *guard = combos.clone();
    }

    if let Ok(mut guard) = child_stdin_store().lock() {
        if let Some(stdin) = guard.as_mut() {
            if let Ok(json) = serde_json::to_string(&combos) {
                if let Err(err) = writeln!(stdin, "{json}") {
                    eprintln!("Failed to write combos to child stdin: {err}");
                }
                let _ = stdin.flush();
            }
        }
    }
}

pub fn start_key_listener(app: &AppHandle) -> Result<(), String> {
    stop_key_listener()?;

    let mut state = listener_state()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());

    eprintln!("Starting keyboard listener");
    let emitter = Arc::new(KeyEventEmitter::new(app));
    let (join_handle, running) = start_external_listener(emitter.clone())?;
    *state = Some(ListenerHandle {
        join_handle,
        running,
        emitter,
    });

    Ok(())
}

pub fn stop_key_listener() -> Result<(), String> {
    let handle = {
        let mut state = listener_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.take()
    };

    if let Some(handle) = handle {
        handle.running.store(false, Ordering::SeqCst);
        stop_listener_child();
        if let Err(err) = handle.join_handle.join() {
            eprintln!("Keyboard listener thread join failed: {err:?}");
        }
        handle.emitter.reset();
    }

    Ok(())
}

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
    #[serde(default)]
    scan_code: u32,
}

fn debug_keys_enabled() -> bool {
    static DEBUG: OnceLock<bool> = OnceLock::new();
    *DEBUG.get_or_init(|| matches!(env::var("VOQUILL_DEBUG_KEYS"), Ok(value) if value == "1"))
}

fn child_store() -> &'static Mutex<Option<Child>> {
    static CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
    CHILD.get_or_init(|| Mutex::new(None))
}

fn start_external_listener(
    emitter: Arc<KeyEventEmitter>,
) -> Result<(JoinHandle<()>, Arc<AtomicBool>), String> {
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|err| format!("failed to bind keyboard listener socket: {err}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|err| format!("failed to configure keyboard listener socket: {err}"))?;
    let port = listener
        .local_addr()
        .map_err(|err| format!("failed to read listener address: {err}"))?
        .port();

    let running = Arc::new(AtomicBool::new(true));
    let thread_running = running.clone();
    let thread_emitter = emitter.clone();

    let handle = thread::spawn(move || {
        run_listener_thread(listener, port, thread_running, thread_emitter);
    });

    Ok((handle, running))
}

fn run_listener_thread(
    listener: TcpListener,
    port: u16,
    running: Arc<AtomicBool>,
    emitter: Arc<KeyEventEmitter>,
) {
    while running.load(Ordering::SeqCst) {
        if let Err(err) = ensure_listener_child(port) {
            eprintln!("Keyboard listener child error: {err}");
            thread::sleep(Duration::from_millis(500));
            continue;
        }

        match listener.accept() {
            Ok((stream, _addr)) => {
                if let Err(err) = pump_stream(stream, emitter.clone()) {
                    eprintln!("Keyboard listener stream error: {err}");
                }
            }
            Err(err) if err.kind() == ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(50));
            }
            Err(err) => {
                eprintln!("Keyboard listener accept error: {err}");
                thread::sleep(Duration::from_millis(200));
            }
        }
    }

    stop_listener_child();
}
fn spawn_listener_child(port: u16) -> Result<Child, String> {
    let exe = std::env::current_exe()
        .map_err(|err| format!("failed to resolve current executable: {err}"))?;

    let mut command = Command::new(exe);
    command
        .env("VOQUILL_KEYBOARD_LISTENER", "1")
        .env("VOQUILL_KEYBOARD_PORT", port.to_string())
        .stdin(Stdio::piped())
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

    let mut child = spawn_listener_child(port)?;

    let stdin = child.stdin.take();
    {
        let mut stdin_guard = child_stdin_store()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        *stdin_guard = stdin;
    }

    {
        let combos = combo_store()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone();
        if !combos.is_empty() {
            if let Ok(mut guard) = child_stdin_store().lock() {
                if let Some(stdin) = guard.as_mut() {
                    if let Ok(json) = serde_json::to_string(&combos) {
                        if let Err(err) = writeln!(stdin, "{json}") {
                            eprintln!("Failed to send initial combos to child: {err}");
                        }
                        let _ = stdin.flush();
                    }
                }
            }
        }
    }

    let mut guard = child_store()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    *guard = Some(child);
    Ok(())
}

fn stop_listener_child() {
    {
        let mut stdin_guard = child_stdin_store()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        *stdin_guard = None;
    }

    let mut guard = child_store()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if let Some(mut child) = guard.take() {
        if let Err(err) = child.kill() {
            eprintln!("Failed to kill keyboard listener child: {err}");
        }
        if let Err(err) = child.wait() {
            eprintln!("Failed to wait for keyboard listener child: {err}");
        }
    }
}

fn pump_stream(stream: TcpStream, emitter: Arc<KeyEventEmitter>) -> Result<(), String> {
    stream
        .set_nodelay(true)
        .map_err(|err| format!("failed to configure keyboard stream: {err}"))?;
    stream
        .set_nonblocking(false)
        .map_err(|err| format!("failed to set blocking mode for keyboard stream: {err}"))?;

    let reader = BufReader::new(stream);
    let lines = reader.lines();
    for line in lines {
        let line = line.map_err(|err| format!("failed to read keyboard event: {err}"))?;
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<KeyboardEventPayload>(&line) {
            Ok(payload) => {
                #[cfg(target_os = "windows")]
                if payload.scan_code == 0 {
                    if debug_keys_enabled() {
                        eprintln!(
                            "[keys] Ignoring injected event (scan_code=0): {:?} {}",
                            payload.kind, payload.key_label
                        );
                    }
                    continue;
                }

                if let Some(event) = event_from_payload(payload) {
                    emitter.handle_event(&event);
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

fn send_event_to_tcp(writer: &Mutex<BufWriter<TcpStream>>, payload: &KeyboardEventPayload) {
    if let Ok(json) = serde_json::to_string(payload) {
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

fn matches_any_combo(pressed: &HashSet<String>, combos: &[Vec<String>]) -> bool {
    for combo in combos {
        if combo.is_empty() {
            continue;
        }
        let all_match = combo
            .iter()
            .all(|k| pressed.iter().any(|p| p.eq_ignore_ascii_case(k)));
        if all_match {
            return true;
        }
    }
    false
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

    let combos: Arc<Mutex<Vec<Vec<String>>>> = Arc::new(Mutex::new(Vec::new()));

    let combos_for_stdin = combos.clone();
    thread::spawn(move || {
        let stdin = std::io::stdin();
        let reader = BufReader::new(stdin.lock());
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => break,
            };
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<Vec<Vec<String>>>(&line) {
                Ok(new_combos) => {
                    if let Ok(mut guard) = combos_for_stdin.lock() {
                        *guard = new_combos;
                    }
                }
                Err(err) => {
                    eprintln!("Keyboard child: malformed combo update: {err}");
                }
            }
        }
    });

    struct GrabState {
        pressed_keys: HashSet<String>,
        suppressed_keys: HashSet<String>,
        combo_active: bool,
    }

    let grab_result = rdev::grab({
        let writer = writer.clone();
        let combos = combos.clone();
        let state = RefCell::new(GrabState {
            pressed_keys: HashSet::new(),
            suppressed_keys: HashSet::new(),
            combo_active: false,
        });
        move |event| -> Option<Event> {
            let (key, is_press) = match event.event_type {
                EventType::KeyPress(key) => (key, true),
                EventType::KeyRelease(key) => (key, false),
                _ => return Some(event),
            };

            let label = key_to_label(key);
            let payload = KeyboardEventPayload {
                kind: if is_press {
                    WireEventKind::Press
                } else {
                    WireEventKind::Release
                },
                key_label: label.clone(),
                raw_code: key_raw_code(key),
                scan_code: event.position_code,
            };
            send_event_to_tcp(&writer, &payload);

            let mut s = state.borrow_mut();

            if is_press {
                s.pressed_keys.insert(label.clone());

                let current_combos = combos
                    .lock()
                    .map(|g| g.clone())
                    .unwrap_or_default();

                if matches_any_combo(&s.pressed_keys, &current_combos) {
                    s.combo_active = true;
                }

                if s.combo_active {
                    s.suppressed_keys.insert(label);
                    return None;
                }

                Some(event)
            } else {
                s.pressed_keys.remove(&label);

                if s.pressed_keys.is_empty() {
                    s.combo_active = false;
                }

                if s.suppressed_keys.remove(&label) {
                    return None;
                }

                Some(event)
            }
        }
    });

    match grab_result {
        Ok(()) => Ok(()),
        Err(grab_err) => {
            eprintln!(
                "rdev::grab() failed ({grab_err:?}), falling back to rdev::listen()"
            );

            let result = rdev::listen({
                let writer = writer.clone();
                move |event| {
                    let payload = match event.event_type {
                        EventType::KeyPress(key) => Some(KeyboardEventPayload {
                            kind: WireEventKind::Press,
                            key_label: key_to_label(key),
                            raw_code: key_raw_code(key),
                            scan_code: event.position_code,
                        }),
                        EventType::KeyRelease(key) => Some(KeyboardEventPayload {
                            kind: WireEventKind::Release,
                            key_label: key_to_label(key),
                            raw_code: key_raw_code(key),
                            scan_code: event.position_code,
                        }),
                        _ => None,
                    };

                    if let Some(payload) = payload {
                        send_event_to_tcp(&writer, &payload);
                    }
                }
            });

            result.map_err(|err| format!("keyboard listener error: {err:?}"))
        }
    }
}
