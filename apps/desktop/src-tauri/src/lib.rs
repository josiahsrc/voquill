use std::{
    fs, io,
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
};

#[cfg(target_os = "macos")]
use std::{
    sync::Mutex,
    time::{Instant, SystemTime, UNIX_EPOCH},
};

#[cfg(target_os = "macos")]
use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, SampleFormat, Stream, StreamConfig,
};

use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use tauri::{Manager, State};
use tauri_plugin_sql::{Builder as SqlPluginBuilder, Migration, MigrationKind};

const DB_FILENAME: &str = "voquill.db";
const DB_CONNECTION: &str = "sqlite:voquill.db";
const CREATE_USERS_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    option_key_count INTEGER NOT NULL DEFAULT 0
);
"#;

struct OptionKeyCounter {
    inner: Arc<AtomicU64>,
}

impl OptionKeyCounter {
    fn new(initial: u64) -> Self {
        Self {
            inner: Arc::new(AtomicU64::new(initial)),
        }
    }

    fn clone_inner(&self) -> Arc<AtomicU64> {
        Arc::clone(&self.inner)
    }

    fn load(&self) -> u64 {
        self.inner.load(Ordering::SeqCst)
    }

    fn store(&self, value: u64) {
        self.inner.store(value, Ordering::SeqCst);
    }
}

#[derive(Clone)]
struct OptionKeyDatabase(SqlitePool);

impl OptionKeyDatabase {
    fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    fn pool(&self) -> SqlitePool {
        self.0.clone()
    }
}

#[cfg(target_os = "macos")]
#[derive(Clone)]
struct RecordingManager {
    inner: Arc<Mutex<Option<ActiveRecording>>>,
}

#[cfg(target_os = "macos")]
struct ActiveRecording {
    _stream: Stream,
    start: Instant,
    buffer: Arc<Mutex<Vec<u8>>>,
}

#[cfg(target_os = "macos")]
struct RecordingMetrics {
    duration: std::time::Duration,
    size_bytes: u64,
}

#[cfg(target_os = "macos")]
#[derive(Debug)]
enum RecordingError {
    AlreadyRecording,
    InputDeviceUnavailable,
    StreamConfig(String),
    StreamBuild(String),
    StreamPlay(String),
    NotRecording,
    UnsupportedFormat(SampleFormat),
}

#[cfg(target_os = "macos")]
impl std::fmt::Display for RecordingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RecordingError::AlreadyRecording => write!(f, "Recording is already in progress"),
            RecordingError::InputDeviceUnavailable => {
                write!(f, "No default input device available")
            }
            RecordingError::StreamConfig(err) => {
                write!(f, "Failed to read input device configuration: {err}")
            }
            RecordingError::StreamBuild(err) => {
                write!(f, "Failed to build input stream: {err}")
            }
            RecordingError::StreamPlay(err) => write!(f, "Failed to start input stream: {err}"),
            RecordingError::NotRecording => write!(f, "No active recording to stop"),
            RecordingError::UnsupportedFormat(format) => {
                write!(f, "Unsupported sample format: {format:?}")
            }
        }
    }
}

#[cfg(target_os = "macos")]
impl std::error::Error for RecordingError {}

#[cfg(target_os = "macos")]
impl RecordingManager {
    fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }

    fn start_recording(&self) -> Result<(), RecordingError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| RecordingError::AlreadyRecording)?;

        if guard.is_some() {
            return Err(RecordingError::AlreadyRecording);
        }

        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or(RecordingError::InputDeviceUnavailable)?;

        let config = device
            .default_input_config()
            .map_err(|err| RecordingError::StreamConfig(err.to_string()))?;

        let sample_format = config.sample_format();
        let stream_config: StreamConfig = config.into();

        let buffer = Arc::new(Mutex::new(Vec::<u8>::new()));

        let stream = match sample_format {
            SampleFormat::I16 => {
                build_input_stream::<i16>(&device, &stream_config, buffer.clone())?
            }
            SampleFormat::U16 => {
                build_input_stream::<u16>(&device, &stream_config, buffer.clone())?
            }
            SampleFormat::F32 => {
                build_input_stream::<f32>(&device, &stream_config, buffer.clone())?
            }
            other => return Err(RecordingError::UnsupportedFormat(other)),
        };

        stream
            .play()
            .map_err(|err| RecordingError::StreamPlay(err.to_string()))?;

        *guard = Some(ActiveRecording {
            _stream: stream,
            start: Instant::now(),
            buffer,
        });

        Ok(())
    }

    fn stop_recording(&self) -> Result<RecordingMetrics, RecordingError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| RecordingError::NotRecording)?;
        let recording = guard.take().ok_or(RecordingError::NotRecording)?;

        let duration = recording.start.elapsed();
        let size_bytes = recording
            .buffer
            .lock()
            .map(|buffer| buffer.len() as u64)
            .unwrap_or(0);

        drop(recording);

        Ok(RecordingMetrics {
            duration,
            size_bytes,
        })
    }
}

#[cfg(target_os = "macos")]
fn build_input_stream<T>(
    device: &Device,
    config: &StreamConfig,
    buffer: Arc<Mutex<Vec<u8>>>,
) -> Result<Stream, RecordingError>
where
    T: cpal::Sample + cpal::SizedSample,
{
    let bytes_per_sample = std::mem::size_of::<T>();
    let callback_buffer = buffer.clone();
    device
        .build_input_stream(
            config,
            move |data: &[T], _| {
                let byte_len = data.len() * bytes_per_sample;
                let raw_bytes =
                    unsafe { std::slice::from_raw_parts(data.as_ptr() as *const u8, byte_len) };
                if let Ok(mut shared_buffer) = callback_buffer.lock() {
                    shared_buffer.extend_from_slice(raw_bytes);
                }
            },
            |err| eprintln!("[recording] stream error: {err}"),
            None,
        )
        .map_err(|err| RecordingError::StreamBuild(err.to_string()))
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_option_key_count(
    counter: State<'_, OptionKeyCounter>,
    database: State<'_, OptionKeyDatabase>,
) -> Result<u64, String> {
    match fetch_option_key_count(database.pool()).await {
        Ok(count) => {
            counter.store(count);
            Ok(count)
        }
        Err(err) => {
            eprintln!("Failed to read option key count from database: {err}");
            Ok(counter.load())
        }
    }
}

fn database_path(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    let mut path = app
        .path()
        .app_config_dir()
        .map_err(|err| io::Error::new(io::ErrorKind::Other, err.to_string()))?;
    fs::create_dir_all(&path)?;
    path.push(DB_FILENAME);
    Ok(path)
}

fn database_url(app: &tauri::AppHandle) -> io::Result<String> {
    let path = database_path(app)?;
    let path_str = path
        .to_str()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "Invalid database path"))?;
    Ok(format!("sqlite:{path_str}"))
}

async fn ensure_option_key_row(pool: SqlitePool) -> Result<u64, sqlx::Error> {
    sqlx::query(CREATE_USERS_TABLE_SQL).execute(&pool).await?;
    sqlx::query("INSERT OR IGNORE INTO users (id, option_key_count) VALUES (1, 0)")
        .execute(&pool)
        .await?;
    fetch_option_key_count(pool).await
}

async fn fetch_option_key_count(pool: SqlitePool) -> Result<u64, sqlx::Error> {
    let row = sqlx::query("SELECT option_key_count FROM users WHERE id = 1")
        .fetch_one(&pool)
        .await?;
    let count: i64 = row.try_get("option_key_count")?;
    Ok(count.max(0) as u64)
}

async fn increment_option_key_count(pool: SqlitePool) -> Result<u64, sqlx::Error> {
    sqlx::query("UPDATE users SET option_key_count = option_key_count + 1 WHERE id = 1")
        .execute(&pool)
        .await?;
    fetch_option_key_count(pool).await
}

async fn set_option_key_count(pool: SqlitePool, count: u64) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE users SET option_key_count = ?1 WHERE id = 1")
        .bind(count as i64)
        .execute(&pool)
        .await?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn type_hello_world_into_focused_field() -> Result<(), String> {
    use core_graphics::event::{CGEvent, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    const HELLO_WORLD_TEXT: &str = "Hello world!";

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "failed to create event source".to_string())?;

    let key_down = CGEvent::new_keyboard_event(source.clone(), 0, true)
        .map_err(|_| "failed to create key-down event".to_string())?;
    key_down.set_string(HELLO_WORLD_TEXT);
    key_down.post(CGEventTapLocation::HID);

    let key_up = CGEvent::new_keyboard_event(source, 0, false)
        .map_err(|_| "failed to create key-up event".to_string())?;
    key_up.set_string("");
    key_up.post(CGEventTapLocation::HID);

    Ok(())
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
        atomic::{AtomicBool, Ordering},
        Arc,
    };
    use tauri::{Emitter, EventTarget};

    #[derive(Clone, Serialize)]
    struct AltEventPayload {
        count: u64,
    }

    #[derive(Clone, Serialize)]
    struct RecordingStartedPayload {
        started_at_ms: u64,
    }

    #[derive(Clone, Serialize)]
    struct RecordingFinishedPayload {
        duration_ms: u64,
        size_bytes: u64,
    }

    #[derive(Clone, Serialize)]
    struct RecordingErrorPayload {
        message: String,
    }

    const LEFT_OPTION_KEYCODE: i64 = 58;
    const RIGHT_OPTION_KEYCODE: i64 = 61;

    let app_handle = app.clone();
    let counter_state = app.state::<OptionKeyCounter>();
    let press_counter = counter_state.clone_inner();
    drop(counter_state);

    let pool_state = app.state::<OptionKeyDatabase>();
    let db_pool = pool_state.pool();
    drop(pool_state);

    std::thread::spawn(move || {
        let is_alt_pressed = Arc::new(AtomicBool::new(false));
        let emit_handle = app_handle.clone();
        let recorder = RecordingManager::new();

        let event_tap = match CGEventTap::new(
            CGEventTapLocation::Session,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::ListenOnly,
            vec![CGEventType::FlagsChanged, CGEventType::KeyDown],
            {
                let counter = press_counter.clone();
                let alt_state = is_alt_pressed.clone();
                let emit_handle = emit_handle.clone();
                let pool = db_pool.clone();
                let recorder = recorder.clone();
                move |_proxy, event_type, event| {
                    let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
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
                                match recorder.start_recording() {
                                    Ok(()) => {
                                        let started_at_ms = SystemTime::now()
                                            .duration_since(UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_millis()
                                            .min(u128::from(u64::MAX))
                                            as u64;
                                        let payload = RecordingStartedPayload { started_at_ms };
                                        if let Err(emit_err) = emit_handle.emit_to(
                                            EventTarget::any(),
                                            "recording-started",
                                            payload,
                                        ) {
                                            eprintln!(
                                                "Failed to emit recording-started event: {emit_err}"
                                            );
                                        }
                                    }
                                    Err(err) => {
                                        eprintln!("Failed to start recording: {err}");
                                        let payload = RecordingErrorPayload {
                                            message: err.to_string(),
                                        };
                                        if let Err(emit_err) = emit_handle.emit_to(
                                            EventTarget::any(),
                                            "recording-error",
                                            payload,
                                        ) {
                                            eprintln!(
                                                "Failed to emit recording-error event: {emit_err}"
                                            );
                                        }
                                    }
                                }

                                let new_count = match tauri::async_runtime::block_on(
                                    increment_option_key_count(pool.clone()),
                                ) {
                                    Ok(count) => {
                                        counter.store(count, Ordering::SeqCst);
                                        count
                                    }
                                    Err(err) => {
                                        eprintln!(
                                            "Failed to update option key count in database: {err}"
                                        );
                                        let fallback_count =
                                            counter.fetch_add(1, Ordering::SeqCst) + 1;
                                        if let Err(sync_err) = tauri::async_runtime::block_on(
                                            set_option_key_count(pool.clone(), fallback_count),
                                        ) {
                                            eprintln!(
                                                "Failed to sync fallback option key count: {sync_err}"
                                            );
                                        }
                                        fallback_count
                                    }
                                };
                                let payload = AltEventPayload { count: new_count };
                                #[cfg(debug_assertions)]
                                {
                                    eprintln!(
                                        "[alt-listener] emitting alt-pressed event: count={}",
                                        new_count
                                    );
                                }
                                if let Err(emit_err) =
                                    emit_handle.emit_to(EventTarget::any(), "alt-pressed", payload)
                                {
                                    eprintln!("Failed to emit alt-pressed event: {emit_err}");
                                }
                            } else if !currently_pressed && was_pressed {
                                match recorder.stop_recording() {
                                    Ok(metrics) => {
                                        let duration_ms =
                                            metrics.duration.as_millis().min(u128::from(u64::MAX))
                                                as u64;
                                        let payload = RecordingFinishedPayload {
                                            duration_ms,
                                            size_bytes: metrics.size_bytes,
                                        };
                                        if let Err(emit_err) = emit_handle.emit_to(
                                            EventTarget::any(),
                                            "recording-finished",
                                            payload,
                                        ) {
                                            eprintln!(
                                                "Failed to emit recording-finished event: {emit_err}"
                                            );
                                        }
                                    }
                                    Err(RecordingError::NotRecording) => { /* no-op */ }
                                    Err(err) => {
                                        eprintln!("Failed to stop recording: {err}");
                                        let payload = RecordingErrorPayload {
                                            message: err.to_string(),
                                        };
                                        if let Err(emit_err) = emit_handle.emit_to(
                                            EventTarget::any(),
                                            "recording-error",
                                            payload,
                                        ) {
                                            eprintln!(
                                                "Failed to emit recording-error event: {emit_err}"
                                            );
                                        }
                                    }
                                }
                                if let Err(err) = type_hello_world_into_focused_field() {
                                    eprintln!(
                                        "Failed to type Hello world! after Alt release: {err}"
                                    );
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
        .plugin(
            SqlPluginBuilder::new()
                .add_migrations(
                    DB_CONNECTION,
                    vec![Migration {
                        version: 1,
                        description: "create_users_table",
                        sql: CREATE_USERS_TABLE_SQL,
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(updater_builder.build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_url = {
                let app_handle = app.handle();
                database_url(&app_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?
            };

            let pool = tauri::async_runtime::block_on(async {
                SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&db_url)
                    .await
            })
            .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

            let initial_count = tauri::async_runtime::block_on(ensure_option_key_row(pool.clone()))
                .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;

            app.manage(OptionKeyDatabase::new(pool));
            app.manage(OptionKeyCounter::new(initial_count));

            #[cfg(desktop)]
            {
                setup_tray(app).map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }
            #[cfg(target_os = "macos")]
            {
                let mac_handle = app.handle();
                spawn_alt_listener(&mac_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_option_key_count])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
