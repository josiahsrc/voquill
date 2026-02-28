use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use crate::compute::ComputeMode;
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperError,
};

#[cfg(feature = "gpu")]
use whisper_rs::vulkan;

#[derive(Debug, Clone)]
pub struct TranscriptionInput {
    pub model_path: PathBuf,
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub language: Option<String>,
    pub initial_prompt: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TranscriptionOutput {
    pub text: String,
    pub inference_device: String,
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

        let context = self.context_for_model(&input.model_path)?;
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
        let inference_device = self.mode.as_str().to_ascii_uppercase();

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

        let params = self.context_params()?;
        WhisperContext::new_with_params(model_path_str, params)
            .map(|_| true)
            .map_err(|err| format!("failed to load model: {err}"))
    }

    fn context_for_model(&self, model_path: &Path) -> Result<Arc<WhisperContext>, String> {
        let key = model_path
            .to_str()
            .ok_or_else(|| "model path is not valid UTF-8".to_string())?
            .to_string();

        if let Some(existing) = self
            .context_cache
            .lock()
            .map_err(|_| "context cache lock poisoned".to_string())?
            .get(&key)
            .cloned()
        {
            return Ok(existing);
        }

        let params = self.context_params()?;
        let context = WhisperContext::new_with_params(&key, params)
            .map_err(|err| format!("failed to initialize whisper context: {err}"))?;

        let context = Arc::new(context);
        let mut cache = self
            .context_cache
            .lock()
            .map_err(|_| "context cache lock poisoned".to_string())?;

        Ok(cache.entry(key).or_insert_with(|| context.clone()).clone())
    }

    fn context_params(&self) -> Result<WhisperContextParameters, String> {
        let mut params = WhisperContextParameters::default();
        match self.mode {
            ComputeMode::Cpu => {
                params.use_gpu(false);
                Ok(params)
            }
            ComputeMode::Gpu => {
                #[cfg(feature = "gpu")]
                {
                    params.use_gpu(true);
                    Ok(params)
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
        let devices = std::panic::catch_unwind(vulkan::list_devices)
            .map_err(|_| "vulkan device enumeration panicked".to_string())?;

        if devices.is_empty() {
            return Err("no Vulkan-capable GPU detected".to_string());
        }

        return Ok(());
    }

    #[cfg(not(feature = "gpu"))]
    {
        Err("gpu runtime check requested but gpu feature is not enabled".to_string())
    }
}
