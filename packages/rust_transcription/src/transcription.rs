use std::collections::HashMap;
#[cfg(feature = "gpu")]
use std::ffi::CStr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use crate::compute::ComputeMode;
use serde::Serialize;
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperError,
};

#[derive(Debug, Clone)]
pub struct TranscriptionInput {
    pub model_path: PathBuf,
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub language: Option<String>,
    pub initial_prompt: Option<String>,
    pub device_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TranscriptionOutput {
    pub text: String,
    pub inference_device: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputeDevice {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone)]
struct ResolvedDevice {
    id: String,
    name: String,
    #[cfg(feature = "gpu")]
    gpu_device: i32,
}

#[derive(Clone)]
pub struct TranscriptionEngine {
    mode: ComputeMode,
    context_cache: Arc<Mutex<HashMap<String, Arc<WhisperContext>>>>,
}

impl TranscriptionEngine {
    pub fn new(mode: ComputeMode) -> Self {
        Self {
            mode,
            context_cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn transcribe(
        &self,
        input: TranscriptionInput,
    ) -> Result<TranscriptionOutput, String> {
        let engine = self.clone();
        tokio::task::spawn_blocking(move || engine.transcribe_blocking(input))
            .await
            .map_err(|err| format!("transcription task failed: {err}"))?
    }

    pub async fn list_devices(&self) -> Result<Vec<ComputeDevice>, String> {
        let engine = self.clone();
        tokio::task::spawn_blocking(move || engine.list_devices_blocking())
            .await
            .map_err(|err| format!("device listing task failed: {err}"))?
    }

    pub async fn validate_model(&self, model_path: PathBuf) -> Result<bool, String> {
        let engine = self.clone();
        tokio::task::spawn_blocking(move || engine.validate_model_blocking(&model_path))
            .await
            .map_err(|err| format!("model validation task failed: {err}"))?
    }

    fn transcribe_blocking(
        &self,
        input: TranscriptionInput,
    ) -> Result<TranscriptionOutput, String> {
        if input.sample_rate == 0 {
            return Err("sampleRate must be greater than 0".to_string());
        }

        if input.samples.is_empty() {
            return Err("samples must not be empty".to_string());
        }

        let filtered_samples: Vec<f32> = input
            .samples
            .into_iter()
            .filter(|sample| sample.is_finite())
            .collect();

        if filtered_samples.is_empty() {
            return Err("no finite samples provided".to_string());
        }

        let processed = resample_to_16khz(&filtered_samples, input.sample_rate);
        if processed.is_empty() {
            return Err("unable to resample audio".to_string());
        }

        let device = self.resolve_device_blocking(input.device_id.as_deref())?;
        let context = self.context_for_model(&input.model_path, &device)?;
        let mut state = context
            .create_state()
            .map_err(|err| format!("failed to create whisper state: {err}"))?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_translate(false);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_no_context(true);

        if let Some(language) = input
            .language
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
        {
            params.set_language(Some(language));
        }

        if let Some(prompt) = input
            .initial_prompt
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
        {
            let sanitized: String = prompt.chars().filter(|ch| *ch != '\0').collect();
            if !sanitized.is_empty() {
                params.set_initial_prompt(&sanitized);
            }
        }

        state
            .full(params, &processed)
            .map_err(|err| format!("failed to run whisper inference: {err}"))?;

        let text = collect_transcription(&state)?;
        let inference_device = device.name.clone();

        Ok(TranscriptionOutput {
            text,
            inference_device,
        })
    }

    fn validate_model_blocking(&self, model_path: &Path) -> Result<bool, String> {
        if !model_path.exists() {
            return Ok(false);
        }

        let model_path_str = model_path
            .to_str()
            .ok_or_else(|| "model path is not valid UTF-8".to_string())?;

        let device = self.resolve_device_blocking(None)?;
        let params = self.context_params(&device)?;
        WhisperContext::new_with_params(model_path_str, params)
            .map(|_| true)
            .map_err(|err| format!("failed to load model: {err}"))
    }

    fn context_for_model(
        &self,
        model_path: &Path,
        device: &ResolvedDevice,
    ) -> Result<Arc<WhisperContext>, String> {
        let model_key = model_path
            .to_str()
            .ok_or_else(|| "model path is not valid UTF-8".to_string())?
            .to_string();
        let key = format!("{model_key}#{}", device.id);

        if let Some(existing) = self
            .context_cache
            .lock()
            .map_err(|_| "context cache lock poisoned".to_string())?
            .get(&key)
            .cloned()
        {
            return Ok(existing);
        }

        let params = self.context_params(device)?;
        let context = WhisperContext::new_with_params(&model_key, params)
            .map_err(|err| format!("failed to initialize whisper context: {err}"))?;

        let context = Arc::new(context);
        let mut cache = self
            .context_cache
            .lock()
            .map_err(|_| "context cache lock poisoned".to_string())?;

        Ok(cache.entry(key).or_insert_with(|| context.clone()).clone())
    }

    fn context_params(
        &self,
        device: &ResolvedDevice,
    ) -> Result<WhisperContextParameters<'_>, String> {
        let mut params = WhisperContextParameters::default();
        match self.mode {
            ComputeMode::Cpu => {
                let _ = device;
                params.use_gpu(false);
                Ok(params)
            }
            ComputeMode::Gpu => {
                #[cfg(feature = "gpu")]
                {
                    params.use_gpu(true);
                    params.gpu_device(device.gpu_device);
                    Ok(params)
                }

                #[cfg(not(feature = "gpu"))]
                {
                    Err("gpu mode requested but binary was built without gpu feature".to_string())
                }
            }
        }
    }

    fn list_devices_blocking(&self) -> Result<Vec<ComputeDevice>, String> {
        match self.mode {
            ComputeMode::Cpu => Ok(vec![ComputeDevice {
                id: "cpu:0".to_string(),
                name: "CPU".to_string(),
            }]),
            ComputeMode::Gpu => {
                #[cfg(feature = "gpu")]
                {
                    list_gpu_devices()
                }

                #[cfg(not(feature = "gpu"))]
                {
                    Err("gpu mode requested but binary was built without gpu feature".to_string())
                }
            }
        }
    }

    fn resolve_device_blocking(
        &self,
        requested_device_id: Option<&str>,
    ) -> Result<ResolvedDevice, String> {
        let devices = self.list_devices_blocking()?;
        if devices.is_empty() {
            return Err(format!("no {} devices available", self.mode.as_str()));
        }

        let selected = if let Some(device_id) = requested_device_id
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            devices
                .into_iter()
                .find(|device| device.id == device_id)
                .ok_or_else(|| format!("unsupported deviceId '{device_id}'"))?
        } else {
            devices
                .into_iter()
                .next()
                .expect("checked non-empty devices")
        };

        match self.mode {
            ComputeMode::Cpu => {
                #[cfg(feature = "gpu")]
                {
                    Ok(ResolvedDevice {
                        id: selected.id,
                        name: selected.name,
                        gpu_device: 0,
                    })
                }

                #[cfg(not(feature = "gpu"))]
                {
                    Ok(ResolvedDevice {
                        id: selected.id,
                        name: selected.name,
                    })
                }
            }
            ComputeMode::Gpu => {
                #[cfg(feature = "gpu")]
                {
                    let (_, index) = selected
                        .id
                        .split_once(':')
                        .ok_or_else(|| format!("invalid gpu device id '{}'", selected.id))?;
                    let gpu_device = index
                        .parse::<i32>()
                        .map_err(|_| format!("invalid gpu device id '{}'", selected.id))?;

                    Ok(ResolvedDevice {
                        id: selected.id,
                        name: selected.name,
                        gpu_device,
                    })
                }

                #[cfg(not(feature = "gpu"))]
                {
                    Err("gpu mode requested but binary was built without gpu feature".to_string())
                }
            }
        }
    }
}

fn collect_transcription(state: &whisper_rs::WhisperState) -> Result<String, String> {
    let mut transcript = String::new();

    for segment in state.as_iter() {
        let piece = match segment.to_str() {
            Ok(value) => value.trim().to_string(),
            Err(WhisperError::InvalidUtf8 { .. }) => segment
                .to_str_lossy()
                .map(|value| value.trim().to_string())
                .unwrap_or_default(),
            Err(err) => return Err(format!("failed to read whisper segment: {err}")),
        };

        if piece.is_empty() {
            continue;
        }

        if !transcript.is_empty() {
            transcript.push(' ');
        }

        transcript.push_str(&piece);
    }

    Ok(transcript.trim().to_string())
}

fn resample_to_16khz(samples: &[f32], sample_rate: u32) -> Vec<f32> {
    const TARGET_RATE: u32 = 16_000;

    if sample_rate == 0 || samples.is_empty() {
        return Vec::new();
    }

    if sample_rate == TARGET_RATE {
        return samples.to_vec();
    }

    let ratio = f64::from(TARGET_RATE) / f64::from(sample_rate);
    let output_len = ((samples.len() as f64) * ratio).ceil().max(1.0) as usize;
    let mut output = Vec::with_capacity(output_len);

    for index in 0..output_len {
        let source_pos = (index as f64) / ratio;
        let lower = source_pos.floor() as usize;
        let fraction = source_pos - (lower as f64);

        let value = if lower + 1 < samples.len() {
            let first = samples[lower];
            let second = samples[lower + 1];
            first + ((second - first) * fraction as f32)
        } else {
            samples[lower]
        };

        output.push(value);
    }

    output
}

pub fn ensure_gpu_runtime_available() -> Result<(), String> {
    #[cfg(feature = "gpu")]
    {
        if list_gpu_devices()?.is_empty() {
            return Err("no GPU-capable backend detected".to_string());
        }

        return Ok(());
    }

    #[cfg(not(feature = "gpu"))]
    {
        Err("gpu runtime check requested but gpu feature is not enabled".to_string())
    }
}

#[cfg(feature = "gpu")]
fn list_gpu_devices() -> Result<Vec<ComputeDevice>, String> {
    let mut devices = Vec::new();
    let mut gpu_index = 0usize;

    for index in 0..unsafe { whisper_rs::whisper_rs_sys::ggml_backend_dev_count() } {
        let device = unsafe { whisper_rs::whisper_rs_sys::ggml_backend_dev_get(index) };
        if device.is_null() {
            continue;
        }

        let device_type = unsafe { whisper_rs::whisper_rs_sys::ggml_backend_dev_type(device) };
        if device_type
            != whisper_rs::whisper_rs_sys::ggml_backend_dev_type_GGML_BACKEND_DEVICE_TYPE_GPU
        {
            continue;
        }

        devices.push(ComputeDevice {
            id: format!("gpu:{gpu_index}"),
            name: describe_gpu_device(device),
        });
        gpu_index += 1;
    }

    Ok(devices)
}

#[cfg(feature = "gpu")]
fn describe_gpu_device(device: whisper_rs::whisper_rs_sys::ggml_backend_dev_t) -> String {
    let description = unsafe {
        c_string(whisper_rs::whisper_rs_sys::ggml_backend_dev_description(device))
    };
    let name = unsafe { c_string(whisper_rs::whisper_rs_sys::ggml_backend_dev_name(device)) };
    let backend = unsafe {
        let registry = whisper_rs::whisper_rs_sys::ggml_backend_dev_backend_reg(device);
        if registry.is_null() {
            None
        } else {
            c_string(whisper_rs::whisper_rs_sys::ggml_backend_reg_name(registry))
        }
    };

    let label = description
        .filter(|value| !value.is_empty())
        .or(name)
        .unwrap_or_else(|| "GPU".to_string());

    match backend {
        Some(backend_name)
            if !backend_name.is_empty() && !backend_name.eq_ignore_ascii_case(&label) =>
        {
            format!("{label} ({backend_name})")
        }
        _ => label,
    }
}

#[cfg(feature = "gpu")]
unsafe fn c_string(ptr: *const std::os::raw::c_char) -> Option<String> {
    if ptr.is_null() {
        return None;
    }

    CStr::from_ptr(ptr)
        .to_str()
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}
