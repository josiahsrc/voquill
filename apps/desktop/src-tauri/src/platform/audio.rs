use crate::domain::{RecordedAudio, RecordingMetrics, RecordingResult};
use crate::errors::RecordingError;
use crate::platform::{LevelCallback, Recorder};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, HostId, SampleFormat, Stream, StreamConfig};
use serde::Serialize;
use std::cmp;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

#[cfg(target_os = "macos")]
use crate::platform::macos::notch_overlay;

pub struct RecordingManager {
    inner: Arc<Mutex<Option<ActiveRecording>>>,
    preferred_input_name: Arc<Mutex<Option<String>>>,
}

struct ActiveRecording {
    _stream: Stream,
    start: Instant,
    buffer: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
    _level_emitter: Option<Arc<LevelEmitter>>,
}

const LEVEL_BIN_COUNT: usize = 12;
const LEVEL_DISPATCH_INTERVAL_MS: u64 = 48;

struct LevelEmitter {
    callback: LevelCallback,
    throttle: Duration,
    last_emit: Mutex<Option<Instant>>,
}

impl LevelEmitter {
    fn new(callback: LevelCallback) -> Arc<Self> {
        Arc::new(Self {
            callback,
            throttle: Duration::from_millis(LEVEL_DISPATCH_INTERVAL_MS),
            last_emit: Mutex::new(None),
        })
    }

    fn emit(&self, samples: &[f32]) {
        if samples.is_empty() {
            return;
        }

        let now = Instant::now();
        let should_emit = {
            let mut guard = match self.last_emit.lock() {
                Ok(guard) => guard,
                Err(poisoned) => poisoned.into_inner(),
            };
            let should_send = match *guard {
                Some(last) => now.duration_since(last) >= self.throttle,
                None => true,
            };
            if should_send {
                *guard = Some(now);
            }
            should_send
        };

        if !should_emit {
            return;
        }

        let levels = compute_level_bins(samples);
        (self.callback)(levels);
    }
}

fn compute_level_bins(samples: &[f32]) -> Vec<f32> {
    if samples.is_empty() {
        return vec![0.0; LEVEL_BIN_COUNT];
    }

    let frames_per_bin = cmp::max(1, samples.len() / LEVEL_BIN_COUNT);
    let mut bins = vec![0.0f32; LEVEL_BIN_COUNT];
    let mut counts = vec![0u32; LEVEL_BIN_COUNT];

    for (index, sample) in samples.iter().enumerate() {
        let bin_index = cmp::min(index / frames_per_bin, LEVEL_BIN_COUNT - 1);
        bins[bin_index] += sample.abs();
        counts[bin_index] += 1;
    }

    for (value, count) in bins.iter_mut().zip(counts.into_iter()) {
        if count > 0 {
            *value = (*value / count as f32).clamp(0.0, 1.0);
        }
    }

    bins
}

impl Drop for ActiveRecording {
    fn drop(&mut self) {
        if let Err(err) = self._stream.pause() {
            eprintln!("[recording] failed to pause input stream: {err}");
        }
    }
}

// cpal::Stream is not Send/Sync across every platform, but we only ever create,
// use, and drop it on the dedicated event tap thread. The interior mutex prevents
// concurrent access, so it is safe for our usage to share the manager/type
// between threads.
unsafe impl Send for RecordingManager {}
unsafe impl Sync for RecordingManager {}
unsafe impl Send for ActiveRecording {}
unsafe impl Sync for ActiveRecording {}

impl RecordingManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
            preferred_input_name: Arc::new(Mutex::new(None)),
        }
    }

    fn guard(&self) -> Result<MutexGuard<'_, Option<ActiveRecording>>, RecordingError> {
        self.inner
            .lock()
            .map_err(|_| RecordingError::AlreadyRecording)
    }

    fn start_recording(&self, level_callback: Option<LevelCallback>) -> Result<(), RecordingError> {
        let preferred_label = {
            let guard = match self.preferred_input_name.lock() {
                Ok(guard) => guard,
                Err(poisoned) => poisoned.into_inner(),
            };
            guard.clone()
        };
        let preferred_trimmed = preferred_label
            .as_ref()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .map(|value| value.to_string());
        let preferred_normalized = preferred_trimmed
            .as_ref()
            .map(|value| value.to_ascii_lowercase());

        let mut guard = self.guard()?;

        if guard.is_some() {
            return Err(RecordingError::AlreadyRecording);
        }

        let mut last_err: Option<RecordingError> = None;
        let emitter = level_callback.map(LevelEmitter::new);

        for host_id in ordered_host_ids() {
            let host = match cpal::host_from_id(host_id) {
                Ok(value) => value,
                Err(err) => {
                    eprintln!("[recording] failed to load host {host_id:?}: {err}");
                    continue;
                }
            };

            match start_recording_on_host(
                &host,
                emitter.clone(),
                preferred_trimmed.as_deref(),
                preferred_normalized.as_deref(),
            ) {
                Ok(active) => {
                    *guard = Some(active);
                    return Ok(());
                }
                Err(err) => {
                    eprintln!(
                        "[recording] host {host_id:?} did not yield a usable input device: {err}"
                    );
                    last_err = Some(err);
                }
            }
        }

        Err(last_err.unwrap_or(RecordingError::InputDeviceUnavailable))
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

impl Recorder for RecordingManager {
    fn start(
        &self,
        level_callback: Option<LevelCallback>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.start_recording(level_callback)
            .map_err(|err| Box::new(err) as _)
    }

    fn stop(&self) -> Result<RecordingResult, Box<dyn std::error::Error>> {
        self.stop_recording().map_err(|err| Box::new(err) as _)
    }

    fn set_preferred_input_device(&self, name: Option<String>) {
        let sanitized = name
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        match self.preferred_input_name.lock() {
            Ok(mut guard) => {
                *guard = sanitized;
            }
            Err(poisoned) => {
                *poisoned.into_inner() = sanitized;
            }
        }
    }
}

const LOW_QUALITY_INPUT_KEYWORDS: &[&str] = &[
    "airpods",
    "beats",
    "bluetooth",
    "earbud",
    "hands-free",
    "headset",
    "hfp",
    "hsp",
    "sony wh-",
];

fn should_avoid_input_device(device: &Device, default_output_name: Option<&str>) -> bool {
    let device_name = device.name().ok();
    let name_match = device_name
        .as_deref()
        .map(|name| {
            let lower = name.to_ascii_lowercase();
            LOW_QUALITY_INPUT_KEYWORDS
                .iter()
                .any(|keyword| lower.contains(keyword))
        })
        .unwrap_or(false);

    let output_match = default_output_name
        .map(|name| {
            let lower = name.to_ascii_lowercase();
            LOW_QUALITY_INPUT_KEYWORDS
                .iter()
                .any(|keyword| lower.contains(keyword))
        })
        .unwrap_or(false);

    if name_match && output_match {
        return true;
    }

    if let Ok(config) = device.default_input_config() {
        if config.sample_rate().0 <= 16_000 {
            return true;
        }
    }

    false
}

fn is_preferred_input_device_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    if LOW_QUALITY_INPUT_KEYWORDS
        .iter()
        .any(|keyword| lower.contains(keyword))
    {
        return false;
    }

    lower.contains("microphone") || lower.contains(" mic") || lower.ends_with("mic")
}

fn is_builtin_microphone_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.contains("built-in")
        || lower.contains("builtin")
        || lower.contains("macbook")
        || lower.contains("mac mini")
        || lower.contains("imac")
        || lower.contains("mac studio")
}

fn name_has_low_quality_keyword(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    LOW_QUALITY_INPUT_KEYWORDS
        .iter()
        .any(|keyword| lower.contains(keyword))
}

fn ordered_host_ids() -> Vec<HostId> {
    let default_host = cpal::default_host();
    let default_id = default_host.id();
    let mut others: Vec<HostId> = cpal::available_hosts()
        .into_iter()
        .filter(|id| *id != default_id)
        .collect();
    others.sort_by_key(|id| host_rank(*id));

    let mut ordered = Vec::with_capacity(others.len() + 1);
    ordered.push(default_id);
    ordered.extend(others);
    ordered
}

#[cfg(target_os = "linux")]
fn host_rank(id: HostId) -> u8 {
    match id.name() {
        "PulseAudio" => 0,
        "ALSA" => 1,
        "JACK" => 2,
        _ => 10,
    }
}

#[cfg(not(target_os = "linux"))]
fn host_rank(_id: HostId) -> u8 {
    0
}

fn start_recording_on_host(
    host: &cpal::Host,
    level_emitter: Option<Arc<LevelEmitter>>,
    preferred_label: Option<&str>,
    preferred_normalized: Option<&str>,
) -> Result<ActiveRecording, RecordingError> {
    let default_output_name = host
        .default_output_device()
        .and_then(|device| device.name().ok());

    let mut candidates =
        device_candidates_for_host(host, default_output_name.as_deref(), preferred_normalized);
    candidates.sort_by_key(|candidate| candidate.priority);

    let mut last_err: Option<RecordingError> = None;

    for candidate in candidates {
        let DeviceCandidate {
            device,
            name,
            avoid_reason,
            matches_preferred,
            ..
        } = candidate;
        let label = name.as_deref().unwrap_or("<unknown>");
        let fallback_preferred = preferred_label.or(preferred_normalized);

        if let Some(reason) = avoid_reason {
            eprintln!(
                "[recording] deprioritising device '{label}' ({reason}); will try if others fail"
            );
        }

        let config = match device.default_input_config() {
            Ok(cfg) => cfg,
            Err(err) => {
                eprintln!("[recording] device '{label}' rejected default config: {err}");
                last_err = Some(RecordingError::StreamConfig(err.to_string()));
                continue;
            }
        };

        let sample_format = config.sample_format();
        let stream_config: StreamConfig = config.into();
        let sample_rate = stream_config.sample_rate.0;
        let buffer = Arc::new(Mutex::new(Vec::<f32>::new()));

        let stream_result = match sample_format {
            SampleFormat::I16 => build_input_stream::<i16>(
                &device,
                &stream_config,
                buffer.clone(),
                level_emitter.clone(),
            ),
            SampleFormat::U16 => build_input_stream::<u16>(
                &device,
                &stream_config,
                buffer.clone(),
                level_emitter.clone(),
            ),
            SampleFormat::F32 => build_input_stream::<f32>(
                &device,
                &stream_config,
                buffer.clone(),
                level_emitter.clone(),
            ),
            other => {
                eprintln!("[recording] device '{label}' has unsupported sample format: {other:?}");
                last_err = Some(RecordingError::UnsupportedFormat(other));
                continue;
            }
        };

        let stream = match stream_result {
            Ok(stream) => stream,
            Err(err) => {
                eprintln!("[recording] failed to build stream for '{label}': {err}");
                last_err = Some(err);
                continue;
            }
        };

        if let Err(err) = stream.play() {
            eprintln!("[recording] failed to start stream for '{label}': {err}");
            last_err = Some(RecordingError::StreamPlay(err.to_string()));
            continue;
        }

        if matches_preferred {
            eprintln!(
                "[recording] using preferred input device '{label}' via host {:?}",
                host.id()
            );
        } else if let Some(preferred) = fallback_preferred {
            eprintln!(
                "[recording] preferred input '{preferred}' not available; using '{label}' via host {:?}",
                host.id()
            );
        } else {
            eprintln!(
                "[recording] using input device '{label}' via host {:?}",
                host.id()
            );
        }

        return Ok(ActiveRecording {
            _stream: stream,
            start: Instant::now(),
            buffer,
            sample_rate,
            _level_emitter: level_emitter.clone(),
        });
    }

    Err(last_err.unwrap_or(RecordingError::InputDeviceUnavailable))
}

struct DeviceCandidate {
    device: Device,
    name: Option<String>,
    normalized_name: Option<String>,
    priority: u32,
    avoid_reason: Option<String>,
    matches_preferred: bool,
    is_default: bool,
}

fn device_candidates_for_host(
    host: &cpal::Host,
    default_output_name: Option<&str>,
    preferred_name: Option<&str>,
) -> Vec<DeviceCandidate> {
    let mut candidates = Vec::new();
    let mut seen = HashSet::new();
    let preferred_lower = preferred_name.map(|value| value.trim().to_ascii_lowercase());

    if let Some(default_device) = host.default_input_device() {
        let name = default_device.name().ok();
        let normalized_name = name
            .as_deref()
            .map(|value| value.trim().to_ascii_lowercase());
        let key = normalized_name
            .clone()
            .unwrap_or_else(|| "<unknown>".to_string());

        let matches_preferred = preferred_lower
            .as_ref()
            .map(|pref| {
                normalized_name
                    .as_ref()
                    .map(|label| label == pref)
                    .unwrap_or(false)
            })
            .unwrap_or(false);

        let should_avoid = should_avoid_input_device(&default_device, default_output_name);
        let mut priority = if matches_preferred { 0 } else { 5 };
        if should_avoid {
            priority = if matches_preferred { 1 } else { 300 };
        }
        let avoid_reason = if should_avoid {
            Some("avoiding low-quality default device".to_string())
        } else {
            None
        };

        seen.insert(key.clone());
        candidates.push(DeviceCandidate {
            device: default_device,
            name,
            normalized_name: Some(key),
            priority,
            avoid_reason,
            matches_preferred,
            is_default: true,
        });
    }

    if let Ok(devices) = host.input_devices() {
        for device in devices {
            let name = device.name().ok();
            let normalized_name = name
                .as_deref()
                .map(|value| value.trim().to_ascii_lowercase());
            let key = normalized_name
                .clone()
                .unwrap_or_else(|| "<unknown>".to_string());

            if seen.contains(&key) {
                continue;
            }

            let matches_preferred = preferred_lower
                .as_ref()
                .map(|pref| {
                    normalized_name
                        .as_ref()
                        .map(|label| label == pref)
                        .unwrap_or(false)
                })
                .unwrap_or(false);

            let mut priority = if matches_preferred { 0 } else { 100 };
            let mut avoid_reason = None;
            if let Some(ref label) = name {
                if is_builtin_microphone_name(label) {
                    priority = 0;
                } else if is_preferred_input_device_name(label) {
                    priority = cmp::min(priority, 10);
                } else if name_has_low_quality_keyword(label) {
                    priority = cmp::max(priority, 250);
                    avoid_reason = Some("potential low-quality input".to_string());
                }
            }

            seen.insert(key.clone());
            candidates.push(DeviceCandidate {
                device,
                name,
                normalized_name: Some(key),
                priority,
                avoid_reason,
                matches_preferred,
                is_default: false,
            });
        }
    }

    candidates
}

#[derive(Clone, Debug, Serialize)]
pub struct InputDeviceDescriptor {
    pub label: String,
    pub is_default: bool,
    pub caution: bool,
}

pub fn list_input_devices() -> Vec<InputDeviceDescriptor> {
    let mut devices: HashMap<String, InputDeviceDescriptor> = HashMap::new();

    for host_id in ordered_host_ids() {
        let host = match cpal::host_from_id(host_id) {
            Ok(value) => value,
            Err(err) => {
                eprintln!("[recording] failed to enumerate host {host_id:?}: {err}");
                continue;
            }
        };

        let default_output_name = host
            .default_output_device()
            .and_then(|device| device.name().ok());

        let candidates = device_candidates_for_host(&host, default_output_name.as_deref(), None);

        for candidate in candidates {
            let label = candidate
                .name
                .as_ref()
                .map(|value| value.trim().to_string())
                .unwrap_or_else(|| "<unknown>".to_string());
            let key = candidate
                .normalized_name
                .clone()
                .unwrap_or_else(|| label.to_ascii_lowercase());

            let entry = devices.entry(key).or_insert_with(|| InputDeviceDescriptor {
                label: label.clone(),
                is_default: false,
                caution: candidate.avoid_reason.is_some(),
            });

            entry.label = label;
            if candidate.avoid_reason.is_some() {
                entry.caution = true;
            }
            if candidate.is_default {
                entry.is_default = true;
            }
        }
    }

    let mut list: Vec<_> = devices.into_values().collect();
    list.sort_by(|a, b| {
        b.is_default.cmp(&a.is_default).then_with(|| {
            a.label
                .to_ascii_lowercase()
                .cmp(&b.label.to_ascii_lowercase())
        })
    });
    list
}

fn build_input_stream<T>(
    device: &Device,
    config: &StreamConfig,
    buffer: Arc<Mutex<Vec<f32>>>,
    level_emitter: Option<Arc<LevelEmitter>>,
) -> Result<Stream, RecordingError>
where
    T: cpal::Sample + cpal::SizedSample,
    f32: cpal::FromSample<T>,
{
    let channel_count = cmp::max(config.channels as usize, 1);
    let callback_buffer = buffer.clone();
    let emitter = level_emitter;
    device
        .build_input_stream(
            config,
            move |data: &[T], _| {
                let mut mono_samples = Vec::with_capacity(data.len() / channel_count + 1);
                #[cfg(target_os = "macos")]
                let mut sum_squares = 0.0f64;
                #[cfg(target_os = "macos")]
                let mut sample_count = 0usize;
                #[cfg(target_os = "macos")]
                let mut peak = 0.0f64;

                if channel_count == 1 {
                    for sample in data {
                        let value = (*sample).to_sample::<f32>();
                        mono_samples.push(value);
                        #[cfg(target_os = "macos")]
                        {
                            let sample64 = value as f64;
                            sum_squares += sample64 * sample64;
                            sample_count += 1;
                            if sample64.abs() > peak {
                                peak = sample64.abs();
                            }
                        }
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
                            let sample_value = data[sample_index].to_sample::<f32>();
                            sum += sample_value;
                            samples_in_frame += 1;
                            #[cfg(target_os = "macos")]
                            {
                                let sample64 = sample_value as f64;
                                sum_squares += sample64 * sample64;
                                sample_count += 1;
                                if sample64.abs() > peak {
                                    peak = sample64.abs();
                                }
                            }
                        }
                        if samples_in_frame > 0 {
                            mono_samples.push(sum / samples_in_frame as f32);
                        }
                        index += channel_count;
                    }
                }

                if let Some(ref level_emitter) = emitter {
                    level_emitter.emit(&mono_samples);
                }

                if let Ok(mut shared_buffer) = callback_buffer.lock() {
                    shared_buffer.extend_from_slice(&mono_samples);
                }

                #[cfg(target_os = "macos")]
                {
                    if sample_count > 0 {
                        let rms = (sum_squares / sample_count as f64).sqrt();
                        let amplitude = (rms * 0.9 + peak * 0.85).min(1.5);
                        notch_overlay::register_amplitude(amplitude.min(1.0));
                    }
                }
            },
            |err| eprintln!("[recording] stream error: {err}"),
            None,
        )
        .map_err(|err| RecordingError::StreamBuild(err.to_string()))
}

#[cfg(test)]
mod tests {
    use super::is_preferred_input_device_name;

    #[test]
    fn preferred_name_blocks_low_quality_keywords() {
        assert!(!is_preferred_input_device_name("AirPods Pro Microphone"));
        assert!(!is_preferred_input_device_name("Bluetooth Mic"));
    }

    #[test]
    fn preferred_name_detects_microphones() {
        assert!(is_preferred_input_device_name("Built-in Microphone"));
        assert!(is_preferred_input_device_name("Zoom Mic"));
        assert!(is_preferred_input_device_name("USB MIC"));
    }

    #[test]
    fn preferred_name_requires_microphone_context() {
        assert!(!is_preferred_input_device_name("USB Audio Device"));
    }
}
