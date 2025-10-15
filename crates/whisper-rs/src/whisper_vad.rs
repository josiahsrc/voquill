use crate::WhisperError;
use std::ffi::{c_char, CString};
use std::os::raw::c_int;
use whisper_rs_sys::{
    whisper_vad_context, whisper_vad_context_params, whisper_vad_detect_speech, whisper_vad_free,
    whisper_vad_free_segments, whisper_vad_init_from_file_with_params, whisper_vad_n_probs,
    whisper_vad_params, whisper_vad_probs, whisper_vad_segments, whisper_vad_segments_from_probs,
    whisper_vad_segments_from_samples, whisper_vad_segments_get_segment_t0,
    whisper_vad_segments_get_segment_t1, whisper_vad_segments_n_segments,
};

/// Configuration for Voice Activity Detection in `whisper.cpp`.
///
/// See [the `whisper.cpp` README](https://github.com/ggml-org/whisper.cpp/#voice-activity-detection-vad) for more details.
#[derive(Copy, Clone)]
pub struct WhisperVadParams {
    params: whisper_vad_params,
}

impl Default for WhisperVadParams {
    fn default() -> Self {
        Self {
            params: whisper_vad_params {
                threshold: 0.5,
                min_speech_duration_ms: 250,
                min_silence_duration_ms: 100,
                max_speech_duration_s: f32::MAX,
                speech_pad_ms: 30,
                samples_overlap: 0.1,
            },
        }
    }
}

impl WhisperVadParams {
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the probability threshold to consider as speech.
    /// A probability for a speech segment/frame above this threshold will be considered as speech.
    ///
    /// Defaults to 0.5.
    pub fn set_threshold(&mut self, threshold: f32) {
        self.params.threshold = threshold;
    }

    /// Set the minimum duration for a valid speech segment, in milliseconds.
    /// Speech segments shorter than this value will be discarded to filter out brief noise or false positives.
    ///
    /// Defaults to 250 milliseconds.
    pub fn set_min_speech_duration(&mut self, min_speech_duration: c_int) {
        self.params.min_speech_duration_ms = min_speech_duration;
    }

    /// Set the minimum silence duration to consider speech as ended.
    /// Silence periods must be at least this long to end a speech segment.
    /// Shorter silence periods will be ignored and included as part of the speech.
    ///
    /// Defaults to 100 milliseconds.
    pub fn set_min_silence_duration(&mut self, min_silence_duration: c_int) {
        self.params.min_silence_duration_ms = min_silence_duration;
    }

    /// Set the maximum duration of a speech segment before forcing a new segment.
    /// Speech segments longer than this will be automatically split into multiple segments at
    /// silence points exceeding 98ms to prevent excessively long segments.
    ///
    /// Defaults to [`f32::MAX`].
    pub fn set_max_speech_duration(&mut self, max_speech_duration: f32) {
        self.params.max_speech_duration_s = max_speech_duration;
    }

    /// Set the amount of padding added before and after speech segments, in milliseconds.
    /// Adds this amount of padding before and after each detected speech segment to avoid cutting off speech edges.
    ///
    /// Defaults to 30 milliseconds.
    pub fn set_speech_pad(&mut self, speech_pad: c_int) {
        self.params.speech_pad_ms = speech_pad;
    }

    /// Sets the amount of audio to extend from each speech segment into the next one, in seconds (e.g., 0.10 = 100ms overlap).
    /// This ensures speech isn't cut off abruptly between segments when they're concatenated together.
    ///
    /// Defaults to 0.1 seconds.
    pub fn set_samples_overlap(&mut self, samples_overlap: f32) {
        self.params.samples_overlap = samples_overlap;
    }

    pub(crate) fn into_inner(self) -> whisper_vad_params {
        self.params
    }
}

/// Whisper VAD context parameters
#[derive(Copy, Clone)]
pub struct WhisperVadContextParams {
    params: whisper_vad_context_params,
}

impl Default for WhisperVadContextParams {
    fn default() -> Self {
        Self {
            params: whisper_vad_context_params {
                n_threads: 4,
                use_gpu: false,
                gpu_device: 0,
            },
        }
    }
}

impl WhisperVadContextParams {
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the number of threads to use for processing
    pub fn set_n_threads(&mut self, n_threads: c_int) {
        self.params.n_threads = n_threads;
    }

    /// Enable the GPU for VAD?
    pub fn set_use_gpu(&mut self, use_gpu: bool) {
        self.params.use_gpu = use_gpu;
    }

    /// The CUDA device to use if `use_gpu` is true
    pub fn set_gpu_device(&mut self, gpu_device: c_int) {
        self.params.gpu_device = gpu_device;
    }

    fn into_inner(self) -> whisper_vad_context_params {
        self.params
    }
}

/// A handle to use `whisper.cpp`'s built in VAD standalone.
///
/// You probably want to use [`Self::segments_from_samples`].
pub struct WhisperVadContext {
    ptr: *mut whisper_vad_context,
}

impl WhisperVadContext {
    pub fn new(model_path: &str, params: WhisperVadContextParams) -> Result<Self, WhisperError> {
        let model_path = CString::new(model_path)
            .expect("VAD model path contains null byte")
            .into_raw() as *const c_char;
        let ptr =
            unsafe { whisper_vad_init_from_file_with_params(model_path, params.into_inner()) };

        if ptr.is_null() {
            Err(WhisperError::NullPointer)
        } else {
            Ok(Self { ptr })
        }
    }

    /// Detect speech in `samples`. Call [`Self::segments_from_probabilities`] to finish the pipeline.
    ///
    /// # Errors
    /// This function will exclusively return `WhisperError::GenericError(-1)` on error.
    /// If you've registered logging hooks, they will have much more detailed information.
    pub fn detect_speech(&mut self, samples: &[f32]) -> Result<(), WhisperError> {
        let (samples, len) = (samples.as_ptr(), samples.len() as c_int);

        let success = unsafe { whisper_vad_detect_speech(self.ptr, samples, len) };

        if !success {
            Err(WhisperError::GenericError(-1))
        } else {
            Ok(())
        }
    }

    /// Get an array of probabilities. Undocumented use.
    pub fn probabilities(&self) -> &[f32] {
        let prob_ptr = unsafe { whisper_vad_probs(self.ptr) };
        let prob_count = unsafe { whisper_vad_n_probs(self.ptr) }
            .try_into()
            .expect("n_probs is too large to fit into usize");
        unsafe { core::slice::from_raw_parts(prob_ptr, prob_count) }
    }

    /// Finish running the VAD pipeline and return segment details.
    ///
    /// # Errors
    /// The only possible error is [`WhisperError::NullPointer`].
    pub fn segments_from_probabilities(
        &mut self,
        params: WhisperVadParams,
    ) -> Result<WhisperVadSegments, WhisperError> {
        let ptr = unsafe { whisper_vad_segments_from_probs(self.ptr, params.into_inner()) };

        if ptr.is_null() {
            Err(WhisperError::NullPointer)
        } else {
            Ok(WhisperVadSegments::new(ptr))
        }
    }

    /// Run the entire VAD pipeline.
    /// This calls both [`Self::detect_speech`] and [`Self::segments_from_probabilities`] behind the scenes.
    ///
    /// # Errors
    /// The only possible error is [`WhisperError::NullPointer`].
    pub fn segments_from_samples(
        &mut self,
        params: WhisperVadParams,
        samples: &[f32],
    ) -> Result<WhisperVadSegments, WhisperError> {
        let (sample_ptr, sample_len) = (samples.as_ptr(), samples.len() as c_int);
        let ptr = unsafe {
            whisper_vad_segments_from_samples(self.ptr, params.into_inner(), sample_ptr, sample_len)
        };

        if ptr.is_null() {
            Err(WhisperError::NullPointer)
        } else {
            Ok(WhisperVadSegments::new(ptr))
        }
    }
}

impl Drop for WhisperVadContext {
    fn drop(&mut self) {
        unsafe { whisper_vad_free(self.ptr) }
    }
}

/// You can obtain this struct from a [`WhisperVadContext`].
pub struct WhisperVadSegments {
    ptr: *mut whisper_vad_segments,
    segment_count: c_int,
    iter_idx: c_int,
}

impl WhisperVadSegments {
    fn new(ptr: *mut whisper_vad_segments) -> Self {
        let segment_count = unsafe { whisper_vad_segments_n_segments(ptr) };
        Self {
            ptr,
            segment_count,
            iter_idx: 0,
        }
    }

    pub fn num_segments(&self) -> c_int {
        self.segment_count
    }

    pub fn index_in_bounds(&self, idx: c_int) -> bool {
        idx >= 0 && idx < self.segment_count
    }

    /// Return the start timestamp of this segment in centiseconds (10s of milliseconds).
    pub fn get_segment_start_timestamp(&self, idx: c_int) -> Option<f32> {
        if self.index_in_bounds(idx) {
            Some(unsafe { whisper_vad_segments_get_segment_t0(self.ptr, idx) })
        } else {
            None
        }
    }

    /// Return the end timestamp of this segment in centiseconds (10s of milliseconds).
    pub fn get_segment_end_timestamp(&self, idx: c_int) -> Option<f32> {
        if self.index_in_bounds(idx) {
            Some(unsafe { whisper_vad_segments_get_segment_t1(self.ptr, idx) })
        } else {
            None
        }
    }

    pub fn get_segment(&self, idx: c_int) -> Option<WhisperVadSegment> {
        let start = self.get_segment_start_timestamp(idx)?;
        let end = self.get_segment_end_timestamp(idx)?;

        Some(WhisperVadSegment { start, end })
    }
}

impl Iterator for WhisperVadSegments {
    type Item = WhisperVadSegment;

    fn next(&mut self) -> Option<Self::Item> {
        let segment = self.get_segment(self.iter_idx)?;
        self.iter_idx += 1;
        Some(segment)
    }
}

#[derive(Copy, Clone)]
pub struct WhisperVadSegment {
    /// Start timestamp of this segment in centiseconds.
    pub start: f32,
    /// End timestamp of this segment in centiseconds.
    pub end: f32,
}

impl Drop for WhisperVadSegments {
    fn drop(&mut self) {
        unsafe { whisper_vad_free_segments(self.ptr) }
    }
}
