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

#[cfg(target_os = "macos")]
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperError,
};

use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use tauri::{Manager, State};
use tauri_plugin_sql::{Builder as SqlPluginBuilder, Migration, MigrationKind};
#[cfg(target_os = "macos")]
use llama_cpp::llama_backend::LlamaBackend;
#[cfg(target_os = "macos")]
use llama_cpp::llama_batch::LlamaBatch;
#[cfg(target_os = "macos")]
use llama_cpp::model::{AddBos, Special};
#[cfg(target_os = "macos")]
use llama_cpp::standard_sampler::StandardSampler;
#[cfg(target_os = "macos")]
use llama_cpp::{LlamaModel, LlamaParams, SessionParams};

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
    buffer: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
}

#[cfg(target_os = "macos")]
struct RecordingMetrics {
    duration: std::time::Duration,
    size_bytes: u64,
}

#[cfg(target_os = "macos")]
struct RecordedAudio {
    samples: Vec<f32>,
    sample_rate: u32,
}

#[cfg(target_os = "macos")]
struct RecordingResult {
    metrics: RecordingMetrics,
    audio: RecordedAudio,
}

#[cfg(target_os = "macos")]
#[derive(Clone)]
struct WhisperTranscriber {
    context: Arc<WhisperContext>,
}

#[cfg(target_os = "macos")]
#[derive(Clone)]
struct LlamaResponder {
    backend: Arc<LlamaBackend>,
    model: Arc<LlamaModel>,
}

#[cfg(target_os = "macos")]
impl WhisperTranscriber {
    fn new(model_path: &std::path::Path) -> Result<Self, String> {
        let model_path_string = model_path
            .to_str()
            .map(str::to_owned)
            .ok_or_else(|| "Invalid Whisper model path".to_string())?;
        let context = WhisperContext::new_with_params(
            &model_path_string,
            WhisperContextParameters::default(),
        )
        .map_err(|err| format!("Failed to load Whisper model: {err}"))?;
        Ok(Self {
            context: Arc::new(context),
        })
    }

    fn transcribe(&self, samples: &[f32], sample_rate: u32) -> Result<String, String> {
        const TARGET_SAMPLE_RATE: u32 = 16_000;

        if samples.is_empty() {
            return Err("No audio samples captured".to_string());
        }
        if sample_rate == 0 {
            return Err("Invalid sample rate (0 Hz)".to_string());
        }

        let processed = if sample_rate == TARGET_SAMPLE_RATE {
            samples.to_vec()
        } else {
            resample_to_sample_rate(samples, sample_rate, TARGET_SAMPLE_RATE)
        };

        if processed.is_empty() {
            return Err("Resampled audio is empty".to_string());
        }

        let mut state = self
            .context
            .create_state()
            .map_err(|err| format!("Failed to create Whisper state: {err}"))?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("en"));
        params.set_translate(false);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_no_context(true);

        state
            .full(params, &processed)
            .map_err(|err| format!("Failed to run Whisper inference: {err}"))?;

        collect_transcription(&state)
    }
}

#[cfg(target_os = "macos")]
impl LlamaResponder {
    fn new(model_path: &std::path::Path) -> Result<Self, String> {
        let backend = LlamaBackend::init()
            .map_err(|err| format!("Failed to initialize Llama backend: {err}"))?;
        let model_params = LlamaParams::default();
        let model = LlamaModel::load_from_file(&backend, model_path, &model_params)
            .map_err(|err| format!("Failed to load Llama model: {err}"))?;
        Ok(Self {
            backend: Arc::new(backend),
            model: Arc::new(model),
        })
    }

    fn answer_question(&self, transcript: &str) -> Result<String, String> {
        let trimmed = transcript.trim();
        if trimmed.is_empty() {
            return Err("No transcription provided for LLM".to_string());
        }

        let prompt = format!(
            "You are a concise assistant.\nTranscript:\n{trimmed}\n\nQuestion: What is the answer?\nAnswer:"
        );

        let ctx_params = SessionParams::default();
        let mut ctx = self
            .model
            .new_context(&self.backend, ctx_params)
            .map_err(|err| format!("Failed to create Llama context: {err}"))?;

        let tokens = self
            .model
            .str_to_token(&prompt, AddBos::Always)
            .map_err(|err| format!("Failed to tokenize prompt for LLM: {err}"))?;

        if tokens.is_empty() {
            return Err("Tokenized prompt is empty".to_string());
        }

        let mut batch = LlamaBatch::new(512, 1);
        let last_index = i32::try_from(tokens.len() - 1)
            .map_err(|_| "Prompt is too long to process".to_string())?;

        for (index, token) in tokens.iter().copied().enumerate() {
            let position = i32::try_from(index)
                .map_err(|_| "Prompt is too long to process".to_string())?;
            let is_last = position == last_index;
            batch
                .add(token, position, &[0], is_last)
                .map_err(|err| format!("Failed to add prompt token to batch: {err}"))?;
        }

        ctx.decode(&mut batch)
            .map_err(|err| format!("Failed to process prompt tokens: {err}"))?;

        let mut sampler = StandardSampler::greedy();
        let mut answer = String::new();
        let mut n_cur = batch.n_tokens();
        let max_tokens = n_cur + 128;
        let eos = self.model.token_eos();

        while n_cur < max_tokens {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);
            sampler.accept(token);

            if token == eos {
                break;
            }

            let piece = self
                .model
                .token_to_str(token, Special::Tokenize)
                .map_err(|err| format!("Failed to decode generated token: {err}"))?;
            answer.push_str(&piece);

            batch.clear();
            batch
                .add(token, n_cur, &[0], true)
                .map_err(|err| format!("Failed to add generated token to batch: {err}"))?;
            n_cur += 1;

            ctx.decode(&mut batch)
                .map_err(|err| format!("Failed during model inference: {err}"))?;
        }

        let final_answer = answer.trim().to_string();
        if final_answer.is_empty() {
            Err("LLM returned empty answer".to_string())
        } else {
            Ok(final_answer)
        }
    }
}

#[cfg(target_os = "macos")]
fn resample_to_sample_rate(samples: &[f32], input_rate: u32, target_rate: u32) -> Vec<f32> {
    if samples.is_empty() || input_rate == 0 || target_rate == 0 {
        return Vec::new();
    }

    if input_rate == target_rate {
        return samples.to_vec();
    }

    let ratio = f64::from(target_rate) / f64::from(input_rate);
    let output_len = ((samples.len() as f64) * ratio).ceil().max(1.0) as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_pos = (i as f64) / ratio;
        let base_index = src_pos.floor() as usize;
        let frac = src_pos - base_index as f64;

        let sample = if base_index + 1 < samples.len() {
            let a = samples[base_index];
            let b = samples[base_index + 1];
            a + (b - a) * frac as f32
        } else {
            samples[base_index]
        };

        output.push(sample);
    }

    output
}

#[cfg(target_os = "macos")]
fn collect_transcription(state: &whisper_rs::WhisperState) -> Result<String, String> {
    let mut transcript = String::new();
    for segment in state.as_iter() {
        match segment.to_str() {
            Ok(text) => {
                if !transcript.is_empty() {
                    transcript.push(' ');
                }
                transcript.push_str(text.trim());
            }
            Err(WhisperError::InvalidUtf8 { .. }) => {
                if let Ok(text) = segment.to_str_lossy() {
                    if !transcript.is_empty() {
                        transcript.push(' ');
                    }
                    transcript.push_str(text.trim());
                }
            }
            Err(err) => {
                return Err(format!("Failed to read Whisper segment: {err}"));
            }
        }
    }

    Ok(transcript.trim().to_string())
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
        let sample_rate = stream_config.sample_rate.0;

        let buffer = Arc::new(Mutex::new(Vec::<f32>::new()));

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
            sample_rate,
        });

        Ok(())
    }

    fn stop_recording(&self) -> Result<RecordingResult, RecordingError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| RecordingError::NotRecording)?;
        let recording = guard.take().ok_or(RecordingError::NotRecording)?;

        let samples = recording
            .buffer
            .lock()
            .map(|buffer| buffer.clone())
            .unwrap_or_default();
        let sample_rate = recording.sample_rate;
        let fallback_duration = recording.start.elapsed();
        let duration = if !samples.is_empty() && sample_rate > 0 {
            let duration_secs = samples.len() as f64 / f64::from(sample_rate);
            std::time::Duration::from_secs_f64(duration_secs)
        } else {
            fallback_duration
        };
        let size_bytes = samples.len() as u64 * std::mem::size_of::<f32>() as u64;

        drop(recording);

        Ok(RecordingResult {
            metrics: RecordingMetrics {
                duration,
                size_bytes,
            },
            audio: RecordedAudio {
                samples,
                sample_rate,
            },
        })
    }
}

#[cfg(target_os = "macos")]
fn build_input_stream<T>(
    device: &Device,
    config: &StreamConfig,
    buffer: Arc<Mutex<Vec<f32>>>,
) -> Result<Stream, RecordingError>
where
    T: cpal::Sample + cpal::SizedSample,
    f32: cpal::FromSample<T>,
{
    let channel_count = std::cmp::max(config.channels as usize, 1);
    let callback_buffer = buffer.clone();
    device
        .build_input_stream(
            config,
            move |data: &[T], _| {
                if let Ok(mut shared_buffer) = callback_buffer.lock() {
                    if channel_count == 1 {
                        for sample in data {
                            shared_buffer.push((*sample).to_sample::<f32>());
                        }
                    } else {
                        let mut index = 0;
                        while index < data.len() {
                            let mut sum = 0.0f32;
                            let mut samples_in_frame = 0usize;
                            for channel in 0..channel_count {
                                let sample_index = index + channel;
                                if sample_index >= data.len() {
                                    break;
                                }
                                sum += data[sample_index].to_sample::<f32>();
                                samples_in_frame += 1;
                            }
                            if samples_in_frame > 0 {
                                shared_buffer.push(sum / samples_in_frame as f32);
                            }
                            index += channel_count;
                        }
                    }
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

#[cfg(target_os = "macos")]
fn whisper_model_path(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    app.path()
        .resolve(
            "resources/models/ggml-base.en.bin",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|err| io::Error::new(io::ErrorKind::NotFound, err.to_string()))
}

#[cfg(target_os = "macos")]
fn llama_model_path(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    app.path()
        .resolve(
            "resources/models/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|err| io::Error::new(io::ErrorKind::NotFound, err.to_string()))
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
fn type_text_into_focused_field(text: &str) -> Result<(), String> {
    use core_graphics::event::{CGEvent, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    if text.trim().is_empty() {
        return Ok(());
    }

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "failed to create event source".to_string())?;

    let key_down = CGEvent::new_keyboard_event(source.clone(), 0, true)
        .map_err(|_| "failed to create key-down event".to_string())?;
    key_down.set_string(text);
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
        transcription: Option<String>,
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

    let transcriber_state = app.state::<WhisperTranscriber>();
    let transcriber_handle: WhisperTranscriber = (*transcriber_state).clone();
    drop(transcriber_state);

    let responder_state = app.state::<LlamaResponder>();
    let responder_handle: LlamaResponder = (*responder_state).clone();
    drop(responder_state);

    std::thread::spawn(move || {
        let is_alt_pressed = Arc::new(AtomicBool::new(false));
        let emit_handle = app_handle.clone();
        let recorder = RecordingManager::new();
        let transcriber = transcriber_handle;
        let responder = responder_handle;

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
                                    Ok(result) => {
                                        let duration_ms = result
                                            .metrics
                                            .duration
                                            .as_millis()
                                            .min(u128::from(u64::MAX))
                                            as u64;
                                        let size_bytes = result.metrics.size_bytes;
                                        let samples = result.audio.samples;
                                        let sample_rate = result.audio.sample_rate;
                                        let emit_finished = emit_handle.clone();
                                        let emit_error = emit_handle.clone();
                                        let transcriber_for_thread = transcriber.clone();
                                        let responder_for_thread = responder.clone();

                                        std::thread::spawn(move || {
                                            let transcription_result = transcriber_for_thread
                                                .transcribe(&samples, sample_rate);

                                            let mut transcription: Option<String> = None;
                                            if let Err(err) = transcription_result.as_ref() {
                                                eprintln!("Transcription failed: {err}");
                                                let payload = RecordingErrorPayload {
                                                    message: err.clone(),
                                                };
                                                if let Err(emit_err) = emit_error.emit_to(
                                                    EventTarget::any(),
                                                    "recording-error",
                                                    payload,
                                                ) {
                                                    eprintln!(
                                                        "Failed to emit recording-error event: {emit_err}"
                                                    );
                                                }
                                            }

                                            if let Ok(text) = transcription_result {
                                                let normalized = text.trim().to_string();
                                                if !normalized.is_empty() {
                                                    transcription = Some(normalized);
                                                }
                                            }

                                            let payload = RecordingFinishedPayload {
                                                duration_ms,
                                                size_bytes,
                                                transcription: transcription.clone(),
                                            };
                                            if let Err(emit_err) = emit_finished.emit_to(
                                                EventTarget::any(),
                                                "recording-finished",
                                                payload,
                                            ) {
                                                eprintln!(
                                                    "Failed to emit recording-finished event: {emit_err}"
                                                );
                                            }

                                            eprintln!("Recording finished");
                                            if let Some(text) = transcription {
                                                let mut text_to_type = text.clone();
                                                match responder_for_thread
                                                    .answer_question(&text)
                                                {
                                                    Ok(answer) => {
                                                        let trimmed = answer.trim();
                                                        if !trimmed.is_empty() {
                                                            text_to_type = trimmed.to_string();
                                                        } else {
                                                            eprintln!(
                                                                "LLM provided empty answer, falling back to transcription"
                                                            );
                                                        }
                                                    }
                                                    Err(err) => {
                                                        eprintln!(
                                                            "LLM inference failed: {err}. Falling back to transcription."
                                                        );
                                                    }
                                                }
                                                if let Err(err) =
                                                    type_text_into_focused_field(&text_to_type)
                                                {
                                                    eprintln!(
                                                        "Failed to type result into field: {err}"
                                                    );
                                                }
                                            }
                                        });
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
                let whisper_path = whisper_model_path(&mac_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
                let transcriber = WhisperTranscriber::new(&whisper_path).map_err(
                    |err| -> Box<dyn std::error::Error> {
                        Box::new(io::Error::new(io::ErrorKind::Other, err))
                    },
                )?;
                app.manage(transcriber);
                let llama_path = llama_model_path(&mac_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
                let responder = LlamaResponder::new(&llama_path).map_err(
                    |err| -> Box<dyn std::error::Error> {
                        Box::new(io::Error::new(io::ErrorKind::Other, err))
                    },
                )?;
                app.manage(responder);
                spawn_alt_listener(&mac_handle)
                    .map_err(|err| -> Box<dyn std::error::Error> { Box::new(err) })?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_option_key_count])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
