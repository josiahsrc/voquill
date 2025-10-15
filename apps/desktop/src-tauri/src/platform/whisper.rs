use crate::platform::Transcriber;
use std::sync::Arc;
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperError,
};

#[cfg(all(target_os = "linux", feature = "linux-gpu"))]
use whisper_rs::vulkan;

pub struct WhisperTranscriber {
    context: Arc<WhisperContext>,
}

impl WhisperTranscriber {
    pub fn new(model_path: &std::path::Path) -> Result<Self, String> {
        let model_path_string = model_path
            .to_str()
            .map(str::to_owned)
            .ok_or_else(|| "Invalid Whisper model path".to_string())?;
        #[cfg(all(target_os = "linux", feature = "linux-gpu"))]
        let context = {
            let mut params = WhisperContextParameters::default();
            params.use_gpu(false);
            let gpu_attempt = configure_linux_gpu(&mut params);

            match WhisperContext::new_with_params(&model_path_string, params) {
                Ok(ctx) => {
                    if gpu_attempt.attempted {
                        if let Some(name) = gpu_attempt.device_name.as_deref() {
                            eprintln!("[whisper] GPU initialised successfully on '{name}'");
                        }
                    }
                    ctx
                }
                Err(err) => {
                    if gpu_attempt.attempted {
                        eprintln!(
                            "[whisper] GPU initialisation failed ({err}). Falling back to CPU inference."
                        );
                        let mut cpu_params = WhisperContextParameters::default();
                        cpu_params.use_gpu(false);
                        WhisperContext::new_with_params(&model_path_string, cpu_params).map_err(
                            |cpu_err| {
                                format!(
                                    "Failed to load Whisper model using GPU ({err}) \
                                     and CPU fallback also failed: {cpu_err}"
                                )
                            },
                        )?
                    } else {
                        return Err(format!("Failed to load Whisper model: {err}"));
                    }
                }
            }
        };

        #[cfg(not(all(target_os = "linux", feature = "linux-gpu")))]
        let context = {
            let params = WhisperContextParameters::default();
            WhisperContext::new_with_params(&model_path_string, params)
                .map_err(|err| format!("Failed to load Whisper model: {err}"))?
        };

        Ok(Self {
            context: Arc::new(context),
        })
    }

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
}

impl Transcriber for WhisperTranscriber {
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

        Self::collect_transcription(&state)
    }
}

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

#[cfg(all(target_os = "linux", feature = "linux-gpu"))]
struct LinuxGpuAttempt {
    attempted: bool,
    device_name: Option<String>,
}

#[cfg(all(target_os = "linux", feature = "linux-gpu"))]
fn configure_linux_gpu(params: &mut WhisperContextParameters) -> LinuxGpuAttempt {
    use std::env;
    use std::panic;

    const DISABLE_ENV: &str = "VOQUILL_WHISPER_DISABLE_GPU";

    if env::var(DISABLE_ENV)
        .map(|value| {
            let trimmed = value.trim();
            trimmed == "1" || trimmed.eq_ignore_ascii_case("true")
        })
        .unwrap_or(false)
    {
        eprintln!("[whisper] GPU usage disabled via {DISABLE_ENV}; using CPU.");
        return LinuxGpuAttempt {
            attempted: false,
            device_name: None,
        };
    }

    let devices = match panic::catch_unwind(|| vulkan::list_devices()) {
        Ok(devs) => devs,
        Err(_) => {
            eprintln!("[whisper] Vulkan device enumeration panicked; falling back to CPU.");
            return LinuxGpuAttempt {
                attempted: false,
                device_name: None,
            };
        }
    };

    if devices.is_empty() {
        eprintln!("[whisper] No Vulkan-capable GPU detected; using CPU.");
        return LinuxGpuAttempt {
            attempted: false,
            device_name: None,
        };
    }

    let selected = devices
        .into_iter()
        .max_by(|left, right| left.vram.free.cmp(&right.vram.free))
        .unwrap();

    params.use_gpu(true);
    params.gpu_device(selected.id);

    let device_name = selected.name.clone();
    let free_gib = selected.vram.free as f64 / (1024.0 * 1024.0 * 1024.0);
    eprintln!(
        "[whisper] attempting GPU inference on '{}' (≈{free_gib:.2} GiB free VRAM)",
        device_name
    );

    LinuxGpuAttempt {
        attempted: true,
        device_name: Some(selected.name),
    }
}

#[cfg(test)]
mod tests {
    use super::resample_to_sample_rate;

    #[test]
    fn resample_returns_empty_for_invalid_input() {
        assert!(resample_to_sample_rate(&[], 44_100, 16_000).is_empty());
        assert!(resample_to_sample_rate(&[0.0], 0, 16_000).is_empty());
        assert!(resample_to_sample_rate(&[0.0], 44_100, 0).is_empty());
    }

    #[test]
    fn resample_identity_when_rates_match() {
        let data = vec![0.1, 0.2, 0.3];
        assert_eq!(resample_to_sample_rate(&data, 16_000, 16_000), data);
    }

    #[test]
    fn resample_produces_expected_length() {
        let data = vec![0.0, 1.0, 0.0, -1.0];
        let resampled = resample_to_sample_rate(&data, 8_000, 16_000);
        assert_eq!(resampled.len(), 8);
    }
}
