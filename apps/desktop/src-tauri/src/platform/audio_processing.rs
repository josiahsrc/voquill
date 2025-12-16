/// Audio processing utilities for normalizing and enhancing voice recordings.
///
/// This module provides industry-standard audio processing to improve transcription
/// accuracy, particularly for quiet or "sub-audible" voice recordings.

/// Target RMS level in dBFS for speech normalization.
/// -18 dBFS is the EBU R128 loudness standard for speech.
const TARGET_RMS_DB: f32 = -18.0;

/// Cutoff frequency for the high-pass filter in Hz.
/// 80Hz removes low-frequency rumble while preserving voice fundamentals.
const HIGHPASS_CUTOFF_HZ: f32 = 80.0;

/// Process audio samples to enhance quiet voices for transcription.
///
/// Applies a two-stage processing pipeline:
/// 1. High-pass filter to remove low-frequency rumble
/// 2. RMS normalization to bring quiet audio to a consistent level
pub fn process_audio_for_transcription(samples: &[f32], sample_rate: u32) -> Vec<f32> {
    if samples.is_empty() || sample_rate == 0 {
        return samples.to_vec();
    }

    // Stage 1: High-pass filter to remove low-frequency noise
    let filtered = highpass_filter(samples, sample_rate, HIGHPASS_CUTOFF_HZ);

    // Stage 2: RMS normalization with soft limiting
    normalize_rms(&filtered, TARGET_RMS_DB)
}

/// Single-pole high-pass filter to remove low-frequency rumble.
///
/// Uses a simple RC filter approximation which is computationally efficient
/// while effectively removing subsonic content that wastes dynamic range.
fn highpass_filter(samples: &[f32], sample_rate: u32, cutoff_hz: f32) -> Vec<f32> {
    if samples.is_empty() || sample_rate == 0 || cutoff_hz <= 0.0 {
        return samples.to_vec();
    }

    let rc = 1.0 / (2.0 * std::f32::consts::PI * cutoff_hz);
    let dt = 1.0 / sample_rate as f32;
    let alpha = rc / (rc + dt);

    let mut output = Vec::with_capacity(samples.len());
    let mut prev_input = 0.0f32;
    let mut prev_output = 0.0f32;

    for &sample in samples {
        let filtered = alpha * (prev_output + sample - prev_input);
        output.push(filtered);
        prev_input = sample;
        prev_output = filtered;
    }

    output
}

/// Normalize audio to a target RMS level with soft limiting.
///
/// RMS (root mean square) normalization measures average loudness rather than
/// peak level, making it ideal for speech where we want consistent volume
/// regardless of momentary peaks or clicks.
///
/// The soft limiter uses a tanh-based curve to prevent harsh clipping when
/// the gain pushes peaks above 1.0.
fn normalize_rms(samples: &[f32], target_rms_db: f32) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }

    // Calculate current RMS using f64 for precision
    let sum_squares: f64 = samples.iter().map(|s| (*s as f64).powi(2)).sum();
    let rms = (sum_squares / samples.len() as f64).sqrt() as f32;

    // Avoid division by zero for silent or near-silent audio
    // -80 dBFS is effectively silence
    if rms < 1e-4 {
        return samples.to_vec();
    }

    // Convert target dB to linear scale (e.g., -18 dBFS → ~0.126)
    let target_rms = 10f32.powf(target_rms_db / 20.0);
    let gain = target_rms / rms;

    // Cap maximum gain to prevent excessive amplification of noise
    // 40 dB of gain (100x) is a reasonable maximum
    let capped_gain = gain.min(100.0);

    if (capped_gain - 1.0).abs() < 0.01 {
        // Gain is essentially unity, no processing needed
        return samples.to_vec();
    }

    // Apply gain with soft limiting
    samples
        .iter()
        .map(|&s| soft_limit(s * capped_gain))
        .collect()
}

/// Soft limiter using tanh-based saturation.
///
/// Provides smooth compression above the threshold to prevent harsh digital
/// clipping while preserving the character of the audio.
#[inline]
fn soft_limit(sample: f32) -> f32 {
    const THRESHOLD: f32 = 0.9;
    const HEADROOM: f32 = 0.1;

    if sample.abs() <= THRESHOLD {
        sample
    } else {
        // Soft saturation above threshold using tanh
        let excess = sample.abs() - THRESHOLD;
        let compressed = THRESHOLD + HEADROOM * excess.tanh();
        sample.signum() * compressed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn process_empty_audio_returns_empty() {
        let result = process_audio_for_transcription(&[], 16000);
        assert!(result.is_empty());
    }

    #[test]
    fn process_zero_sample_rate_returns_input() {
        let samples = vec![0.1, 0.2, 0.3];
        let result = process_audio_for_transcription(&samples, 0);
        assert_eq!(result, samples);
    }

    #[test]
    fn normalize_silent_audio_returns_unchanged() {
        let samples = vec![0.0; 100];
        let result = normalize_rms(&samples, -18.0);
        assert_eq!(result, samples);
    }

    #[test]
    fn normalize_quiet_audio_increases_level() {
        // Very quiet audio at roughly -60 dBFS
        let samples: Vec<f32> = (0..1000).map(|i| 0.001 * (i as f32 * 0.1).sin()).collect();

        // Calculate input RMS
        let input_sum_squares: f64 = samples.iter().map(|s| (*s as f64).powi(2)).sum();
        let input_rms = (input_sum_squares / samples.len() as f64).sqrt() as f32;

        let result = normalize_rms(&samples, -18.0);

        // Calculate output RMS
        let output_sum_squares: f64 = result.iter().map(|s| (*s as f64).powi(2)).sum();
        let output_rms = (output_sum_squares / result.len() as f64).sqrt() as f32;

        // Output should be significantly louder than input
        assert!(
            output_rms > input_rms * 10.0,
            "Output RMS {output_rms} should be much higher than input RMS {input_rms}"
        );

        // Output should be in a reasonable range (not clipping)
        let max_sample = result.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        assert!(
            max_sample <= 1.0,
            "Max sample {max_sample} should not exceed 1.0"
        );
    }

    #[test]
    fn soft_limit_preserves_normal_samples() {
        assert_eq!(soft_limit(0.5), 0.5);
        assert_eq!(soft_limit(-0.5), -0.5);
        assert_eq!(soft_limit(0.0), 0.0);
    }

    #[test]
    fn soft_limit_compresses_loud_samples() {
        // Values above threshold should be compressed
        let result = soft_limit(1.5);
        assert!(result > 0.9, "Should be above threshold");
        assert!(result < 1.0, "Should be below 1.0");
    }

    #[test]
    fn highpass_removes_dc_offset() {
        // Audio with DC offset
        let samples: Vec<f32> = (0..1000).map(|i| 0.5 + 0.1 * (i as f32 * 0.1).sin()).collect();
        let result = highpass_filter(&samples, 16000, 80.0);

        // DC component should be significantly reduced
        let dc: f32 = result.iter().sum::<f32>() / result.len() as f32;
        assert!(
            dc.abs() < 0.1,
            "DC offset should be reduced, got {dc}"
        );
    }
}
