use crate::platform::Transcriber;
use std::sync::Arc;
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperError,
};

pub struct WhisperTranscriber {
    context: Arc<WhisperContext>,
}

impl WhisperTranscriber {
    pub fn new(model_path: &std::path::Path) -> Result<Self, String> {
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
