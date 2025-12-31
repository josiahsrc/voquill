#[cfg(feature = "cuda")]
use crate::platform::{Transcriber, TranscriptionDevice, TranscriptionRequest};
use std::path::PathBuf;

#[cfg(feature = "cuda")]
pub struct ParakeetTranscriber {
    model_path: PathBuf,
}

#[cfg(feature = "cuda")]
impl ParakeetTranscriber {
    pub fn new(model_path: &std::path::Path) -> Result<Self, String> {
        // Validate that required model files exist
        // parakeet-rs TDT models require: encoder-model.onnx, encoder-model.onnx.data,
        // decoder_joint-model.onnx, vocab.txt
        let required_files = [
            "encoder-model.onnx",
            "encoder-model.onnx.data",
            "decoder_joint-model.onnx",
            "vocab.txt",
        ];

        for file in &required_files {
            let path = model_path.join(file);
            if !path.exists() {
                return Err(format!("Missing Parakeet model file: {}", file));
            }
        }

        eprintln!(
            "[parakeet] Initialized with model path: {}",
            model_path.display()
        );

        Ok(Self {
            model_path: model_path.to_path_buf(),
        })
    }
}

#[cfg(feature = "cuda")]
impl Transcriber for ParakeetTranscriber {
    fn transcribe(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: Option<&TranscriptionRequest>,
    ) -> Result<String, String> {
        // Parakeet expects 16kHz audio
        const TARGET_SAMPLE_RATE: u32 = 16_000;

        if samples.is_empty() {
            return Err("No audio samples captured".to_string());
        }
        if sample_rate == 0 {
            return Err("Invalid sample rate (0 Hz)".to_string());
        }

        // Check if CPU-only was requested - Parakeet requires GPU
        if let Some(req) = request {
            if let Some(device) = &req.device {
                if matches!(device, TranscriptionDevice::Cpu) {
                    return Err(
                        "Parakeet requires NVIDIA GPU with CUDA support. CPU inference is not available. Please select a Whisper model or enable GPU acceleration."
                            .to_string(),
                    );
                }
            }
        }

        // Resample if needed
        let processed = if sample_rate == TARGET_SAMPLE_RATE {
            samples.to_vec()
        } else {
            resample_to_sample_rate(samples, sample_rate, TARGET_SAMPLE_RATE)
        };

        if processed.is_empty() {
            return Err("Resampled audio is empty".to_string());
        }

        // Initialize parakeet-rs TDT model with CUDA
        use parakeet_rs::{ExecutionConfig, ExecutionProvider, ParakeetTDT};

        eprintln!(
            "[parakeet] Initializing ParakeetTDT from path: {}",
            self.model_path.display()
        );
        eprintln!(
            "[parakeet] Sample rate: {}Hz, Sample count: {}",
            TARGET_SAMPLE_RATE,
            processed.len()
        );

        // // Configure CUDA execution
        let config = ExecutionConfig::default();
        //     .with_execution_provider(ExecutionProvider::Cuda);

        eprintln!("[parakeet] Loading TDT model with CUDA execution provider...");
        let mut parakeet = ParakeetTDT::from_pretrained(&self.model_path, Some(config))
            .map_err(|e| {
                eprintln!("[parakeet] ERROR: Failed to initialize TDT model: {:?}", e);
                format!("Failed to initialize Parakeet TDT with CUDA: {}. This may indicate CUDA driver issues or incompatible GPU drivers.", e)
            })?;

        eprintln!("[parakeet] TDT model loaded successfully, starting transcription...");

        // Transcribe from samples (16kHz mono audio)
        // Note: parakeet-rs expects Vec<f32>, not &[f32]
        let result = parakeet
            .transcribe_samples(processed.clone(), TARGET_SAMPLE_RATE, 1, None)
            .map_err(|e| {
                eprintln!("[parakeet] ERROR: Transcription failed: {:?}", e);
                format!(
                    "Parakeet TDT CUDA transcription failed: {}. Try switching to a Whisper model in Settings.",
                    e
                )
            })?;

        // merge all tokens together with no spaces between them
        let merged = result.tokens.iter()
            .map(|t| t.text.as_str())
            .collect::<Vec<_>>()
            .join("");

        Ok(merged)
    }
}

#[cfg(feature = "cuda")]
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

#[cfg(feature = "cuda")]
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parakeet_requires_valid_model_path() {
        let invalid_path = std::path::Path::new("/nonexistent");
        let result = ParakeetTranscriber::new(invalid_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Missing Parakeet model file"));
    }

    #[test]
    fn test_resample_identity_when_rates_match() {
        let data = vec![0.1, 0.2, 0.3];
        assert_eq!(resample_to_sample_rate(&data, 16_000, 16_000), data);
    }

    #[test]
    fn test_resample_produces_expected_length() {
        let data = vec![0.0, 1.0, 0.0, -1.0];
        let resampled = resample_to_sample_rate(&data, 8_000, 16_000);
        assert_eq!(resampled.len(), 8);
    }
}
