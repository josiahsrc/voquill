use crate::platform::{GpuDescriptor, Transcriber, TranscriptionDevice, TranscriptionRequest};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperError,
};

#[cfg(all(target_os = "linux", feature = "linux-gpu"))]
use whisper_rs::vulkan;

#[cfg(all(target_os = "linux", feature = "linux-gpu"))]
const DISABLE_ENV: &str = "VOQUILL_WHISPER_DISABLE_GPU";

pub struct WhisperTranscriber {
    model_path: String,
    default_context: Arc<WhisperContext>,
    context_cache: Mutex<HashMap<ContextCacheKey, Arc<WhisperContext>>>,
}

enum ContextStrategy<'a> {
    Auto,
    Cpu,
    Gpu(&'a GpuDescriptor),
}

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
struct ContextCacheKey {
    model_path: String,
    variant: ContextCacheVariant,
}

impl ContextCacheKey {
    fn new(model_path: &str, variant: ContextCacheVariant) -> Self {
        Self {
            model_path: model_path.to_string(),
            variant,
        }
    }
}

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
enum ContextCacheVariant {
    Auto,
    Cpu,
    Gpu {
        id: Option<u32>,
        name: Option<String>,
    },
}

impl WhisperTranscriber {
    pub fn new(model_path: &std::path::Path) -> Result<Self, String> {
        let model_path_string = model_path
            .to_str()
            .map(str::to_owned)
            .ok_or_else(|| "Invalid Whisper model path".to_string())?;
        let default_context = Self::load_context(&model_path_string, ContextStrategy::Auto)?;
        let mut cache = HashMap::new();
        cache.insert(
            ContextCacheKey::new(&model_path_string, ContextCacheVariant::Auto),
            default_context.clone(),
        );

        Ok(Self {
            model_path: model_path_string,
            default_context,
            context_cache: Mutex::new(cache),
        })
    }

    fn context_for_request(
        &self,
        request: Option<&TranscriptionRequest>,
    ) -> Result<Arc<WhisperContext>, String> {
        let mut model_path_ref = self.model_path.as_str();
        let mut strategy = ContextStrategy::Auto;
        let mut cache_variant = ContextCacheVariant::Auto;

        if let Some(req) = request {
            if let Some(path) = req.model_path.as_deref() {
                model_path_ref = path;
            }

            if let Some(device) = req.device.as_ref() {
                match device {
                    TranscriptionDevice::Cpu => {
                        strategy = ContextStrategy::Cpu;
                        cache_variant = ContextCacheVariant::Cpu;
                    }
                    TranscriptionDevice::Gpu(descriptor) => {
                        strategy = ContextStrategy::Gpu(descriptor);
                        cache_variant = ContextCacheVariant::Gpu {
                            id: descriptor.id,
                            name: descriptor.name.clone(),
                        };
                    }
                }
            }
        }

        if model_path_ref == self.model_path && matches!(cache_variant, ContextCacheVariant::Auto) {
            return Ok(self.default_context.clone());
        }

        let cache_key = ContextCacheKey::new(model_path_ref, cache_variant.clone());

        if let Some(existing) = {
            let cache = self.context_cache.lock().unwrap();
            cache.get(&cache_key).cloned()
        } {
            return Ok(existing);
        }

        let context = Self::load_context(model_path_ref, strategy)?;

        let mut cache = self.context_cache.lock().unwrap();
        Ok(cache
            .entry(cache_key)
            .or_insert_with(|| context.clone())
            .clone())
    }

    fn load_context(
        model_path: &str,
        strategy: ContextStrategy,
    ) -> Result<Arc<WhisperContext>, String> {
        #[cfg(all(target_os = "linux", feature = "linux-gpu"))]
        {
            return Self::load_context_with_linux_gpu(model_path, strategy);
        }

        #[cfg(not(all(target_os = "linux", feature = "linux-gpu")))]
        {
            Self::load_context_without_gpu(model_path, strategy)
        }
    }

    #[cfg(all(target_os = "linux", feature = "linux-gpu"))]
    fn load_context_with_linux_gpu(
        model_path: &str,
        strategy: ContextStrategy,
    ) -> Result<Arc<WhisperContext>, String> {
        match strategy {
            ContextStrategy::Auto => {
                let mut params = WhisperContextParameters::default();
                params.use_gpu(false);
                let gpu_attempt = configure_linux_gpu_auto(&mut params);

                match WhisperContext::new_with_params(model_path, params) {
                    Ok(ctx) => {
                        if gpu_attempt.attempted {
                            if let Some(name) = gpu_attempt.device_name.as_deref() {
                                eprintln!("[whisper] GPU initialised successfully on '{name}'");
                            }
                        }
                        Ok(Arc::new(ctx))
                    }
                    Err(err) => {
                        if gpu_attempt.attempted {
                            eprintln!(
                                "[whisper] GPU initialisation failed ({err}). Falling back to CPU inference."
                            );
                            let mut cpu_params = WhisperContextParameters::default();
                            cpu_params.use_gpu(false);
                            let cpu_context = WhisperContext::new_with_params(
                                model_path, cpu_params,
                            )
                            .map_err(|cpu_err| {
                                format!(
                                    "Failed to load Whisper model using GPU ({err}) \
                                     and CPU fallback also failed: {cpu_err}"
                                )
                            })?;

                            return Ok(Arc::new(cpu_context));
                        }

                        Err(format!("Failed to load Whisper model: {err}"))
                    }
                }
            }
            ContextStrategy::Cpu => {
                let mut params = WhisperContextParameters::default();
                params.use_gpu(false);
                WhisperContext::new_with_params(model_path, params)
                    .map_err(|err| format!("Failed to load Whisper model on CPU: {err}"))
                    .map(Arc::new)
            }
            ContextStrategy::Gpu(descriptor) => {
                let mut params = WhisperContextParameters::default();
                params.use_gpu(false);
                let selected_name = configure_linux_gpu_selection(&mut params, descriptor)?;

                match WhisperContext::new_with_params(model_path, params) {
                    Ok(ctx) => {
                        eprintln!("[whisper] GPU initialised successfully on '{selected_name}'");
                        Ok(Arc::new(ctx))
                    }
                    Err(err) => Err(format!(
                        "Failed to load Whisper model on GPU '{selected_name}': {err}"
                    )),
                }
            }
        }
    }

    #[cfg(not(all(target_os = "linux", feature = "linux-gpu")))]
    fn load_context_without_gpu(
        model_path: &str,
        strategy: ContextStrategy,
    ) -> Result<Arc<WhisperContext>, String> {
        match strategy {
            ContextStrategy::Gpu(descriptor) => {
                let gpu_label = descriptor
                    .name
                    .as_deref()
                    .map(|name| format!("'{name}'"))
                    .or_else(|| descriptor.id.map(|id| format!("id {id}")))
                    .unwrap_or_else(|| "unspecified GPU".to_string());

                Err(format!(
                    "GPU selection for {gpu_label} is not supported on this platform"
                ))
            }
            ContextStrategy::Cpu => {
                let mut params = WhisperContextParameters::default();
                params.use_gpu(false);

                WhisperContext::new_with_params(model_path, params)
                    .map_err(|err| format!("Failed to load Whisper model on CPU: {err}"))
                    .map(Arc::new)
            }
            ContextStrategy::Auto => {
                WhisperContext::new_with_params(model_path, WhisperContextParameters::default())
                    .map_err(|err| format!("Failed to load Whisper model: {err}"))
                    .map(Arc::new)
            }
        }
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
    fn transcribe(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: Option<&TranscriptionRequest>,
    ) -> Result<String, String> {
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

        let context = self.context_for_request(request)?;
        let mut state = context
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

        if let Some(req) = request {
            if let Some(prompt) = req.initial_prompt.as_ref() {
                let sanitized: String = prompt.chars().filter(|ch| *ch != '\0').collect();
                let trimmed = sanitized.trim();
                if !trimmed.is_empty() {
                    params.set_initial_prompt(trimmed);
                }
            }
        }

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
fn gpu_usage_disabled_via_env() -> bool {
    use std::env;

    env::var(DISABLE_ENV)
        .map(|value| {
            let trimmed = value.trim();
            trimmed == "1" || trimmed.eq_ignore_ascii_case("true")
        })
        .unwrap_or(false)
}

#[cfg(all(target_os = "linux", feature = "linux-gpu"))]
fn configure_linux_gpu_auto(params: &mut WhisperContextParameters) -> LinuxGpuAttempt {
    use std::panic;

    if gpu_usage_disabled_via_env() {
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

#[cfg(all(target_os = "linux", feature = "linux-gpu"))]
fn configure_linux_gpu_selection(
    params: &mut WhisperContextParameters,
    descriptor: &GpuDescriptor,
) -> Result<String, String> {
    use std::panic;

    if gpu_usage_disabled_via_env() {
        return Err(format!(
            "GPU usage disabled via {DISABLE_ENV}; unable to select GPU device"
        ));
    }

    let devices = match panic::catch_unwind(|| vulkan::list_devices()) {
        Ok(devs) => devs,
        Err(_) => {
            return Err(
                "Vulkan device enumeration panicked while selecting GPU; GPU inference unavailable"
                    .to_string(),
            );
        }
    };

    if devices.is_empty() {
        return Err("No Vulkan-capable GPU detected; unable to select GPU device".to_string());
    }

    let selected = descriptor
        .id
        .and_then(|id| devices.iter().find(|device| device.id == id as i32))
        .or_else(|| {
            descriptor.name.as_ref().and_then(|name| {
                devices
                    .iter()
                    .find(|device| device.name.eq_ignore_ascii_case(name))
            })
        })
        .ok_or_else(|| match (descriptor.id, descriptor.name.as_ref()) {
            (Some(id), Some(name)) => {
                format!("No GPU matching id {id} or name '{name}' was found for Whisper inference")
            }
            (Some(id), None) => {
                format!("No GPU matching id {id} was found for Whisper inference")
            }
            (None, Some(name)) => {
                format!("No GPU matching name '{name}' was found for Whisper inference")
            }
            (None, None) => {
                "No GPU identifier provided for Whisper inference selection".to_string()
            }
        })?;

    params.use_gpu(true);
    params.gpu_device(selected.id);

    let device_name = selected.name.clone();
    let free_gib = selected.vram.free as f64 / (1024.0 * 1024.0 * 1024.0);
    eprintln!(
        "[whisper] attempting GPU inference on '{}' (≈{free_gib:.2} GiB free VRAM)",
        device_name
    );

    Ok(device_name)
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
