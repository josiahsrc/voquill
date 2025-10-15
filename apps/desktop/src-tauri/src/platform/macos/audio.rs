use crate::domain::{RecordedAudio, RecordingMetrics, RecordingResult};
use crate::errors::RecordingError;
use crate::platform::Recorder;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, Stream, StreamConfig};
use std::cmp;
use std::sync::Mutex;
use std::sync::{Arc, MutexGuard};
use std::time::Instant;

pub struct RecordingManager {
    inner: Arc<Mutex<Option<ActiveRecording>>>,
}

struct ActiveRecording {
    _stream: Stream,
    start: Instant,
    buffer: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
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
        }
    }

    fn guard(&self) -> Result<MutexGuard<'_, Option<ActiveRecording>>, RecordingError> {
        self.inner
            .lock()
            .map_err(|_| RecordingError::AlreadyRecording)
    }

    fn start_recording(&self) -> Result<(), RecordingError> {
        let mut guard = self.guard()?;

        if guard.is_some() {
            return Err(RecordingError::AlreadyRecording);
        }

        let host = cpal::default_host();
        let default_output_name = host
            .default_output_device()
            .and_then(|device| device.name().ok());

        let mut device = host
            .default_input_device()
            .ok_or(RecordingError::InputDeviceUnavailable)?;
        let selected_device_name = device.name().ok();

        if should_avoid_input_device(&device, default_output_name.as_deref()) {
            if let Some(fallback_device) =
                find_preferred_input_device(&host, selected_device_name.as_deref())
            {
                let fallback_name = fallback_device.name().ok();
                log_input_device_switch(selected_device_name.as_deref(), fallback_name.as_deref());
                device = fallback_device;
            }
        }

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

impl Recorder for RecordingManager {
    fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.start_recording().map_err(|err| Box::new(err) as _)
    }

    fn stop(&self) -> Result<RecordingResult, Box<dyn std::error::Error>> {
        self.stop_recording().map_err(|err| Box::new(err) as _)
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

fn find_preferred_input_device(
    host: &cpal::Host,
    avoided_device_name: Option<&str>,
) -> Option<Device> {
    let devices = host.input_devices().ok()?;
    let mut fallback: Option<Device> = None;

    for device in devices {
        let Ok(name) = device.name() else {
            continue;
        };

        if Some(name.as_str()) == avoided_device_name {
            continue;
        }

        if !is_preferred_input_device_name(&name) {
            continue;
        }

        if is_builtin_microphone_name(&name) {
            return Some(device);
        }

        if fallback.is_none() {
            fallback = Some(device);
        }
    }

    fallback
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

fn log_input_device_switch(original: Option<&str>, replacement: Option<&str>) {
    match (original, replacement) {
        (Some(orig), Some(new_name)) => eprintln!(
            "[recording] switching input device from '{orig}' to '{new_name}' to keep playback audio quality unchanged"
        ),
        (Some(orig), None) => eprintln!(
            "[recording] switching input device away from '{orig}' to keep playback audio quality unchanged"
        ),
        (None, Some(new_name)) => eprintln!(
            "[recording] switching input device to '{new_name}' to keep playback audio quality unchanged"
        ),
        (None, None) => eprintln!(
            "[recording] switching input device to keep playback audio quality unchanged"
        ),
    }
}

fn build_input_stream<T>(
    device: &Device,
    config: &StreamConfig,
    buffer: Arc<Mutex<Vec<f32>>>,
) -> Result<Stream, RecordingError>
where
    T: cpal::Sample + cpal::SizedSample,
    f32: cpal::FromSample<T>,
{
    let channel_count = cmp::max(config.channels as usize, 1);
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
