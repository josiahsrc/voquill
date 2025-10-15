use std::ffi::c_int;
use std::sync::Arc;

use crate::{FullParams, WhisperError, WhisperInnerContext, WhisperTokenId};

mod iterator;
mod segment;

pub use iterator::WhisperStateSegmentIterator;
pub use segment::{WhisperSegment, WhisperToken};

/// Rustified pointer to a Whisper state.
#[derive(Debug)]
pub struct WhisperState {
    ctx: Arc<WhisperInnerContext>,
    ptr: *mut whisper_rs_sys::whisper_state,
}

unsafe impl Send for WhisperState {}

unsafe impl Sync for WhisperState {}

impl Drop for WhisperState {
    fn drop(&mut self) {
        unsafe {
            whisper_rs_sys::whisper_free_state(self.ptr);
        }
    }
}

impl WhisperState {
    /// # Safety
    /// * `ptr` must be non-null
    /// * `ptr` must be a valid pointer to a `whisper_state`.
    pub(crate) unsafe fn new(
        ctx: Arc<WhisperInnerContext>,
        ptr: *mut whisper_rs_sys::whisper_state,
    ) -> Self {
        Self { ctx, ptr }
    }

    /// Convert raw PCM audio (floating point 32 bit) to log mel spectrogram.
    /// The resulting spectrogram is stored in the context transparently.
    ///
    /// # Arguments
    /// * pcm: The raw PCM audio.
    /// * threads: How many threads to use. Defaults to 1. Must be at least 1, returns an error otherwise.
    ///
    /// # Returns
    /// Ok(()) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_pcm_to_mel(struct whisper_context * ctx, const float * samples, int n_samples, int n_threads)`
    pub fn pcm_to_mel(&mut self, pcm: &[f32], threads: usize) -> Result<(), WhisperError> {
        if threads < 1 {
            return Err(WhisperError::InvalidThreadCount);
        }
        let ret = unsafe {
            whisper_rs_sys::whisper_pcm_to_mel_with_state(
                self.ctx.ctx,
                self.ptr,
                pcm.as_ptr(),
                pcm.len() as c_int,
                threads as c_int,
            )
        };
        if ret == -1 {
            Err(WhisperError::UnableToCalculateSpectrogram)
        } else if ret == 0 {
            Ok(())
        } else {
            Err(WhisperError::GenericError(ret))
        }
    }

    /// This can be used to set a custom log mel spectrogram inside the provided whisper state.
    /// Use this instead of whisper_pcm_to_mel() if you want to provide your own log mel spectrogram.
    ///
    /// # Note
    /// This is a low-level function.
    /// If you're a typical user, you probably don't want to use this function.
    /// See instead [WhisperState::pcm_to_mel].
    ///
    /// # Arguments
    /// * data: The log mel spectrogram.
    ///
    /// # Returns
    /// Ok(()) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_set_mel(struct whisper_context * ctx, const float * data, int n_len, int n_mel)`
    pub fn set_mel(&mut self, data: &[f32]) -> Result<(), WhisperError> {
        let hop_size = 160;
        let n_len = (data.len() / hop_size) * 2;
        let ret = unsafe {
            whisper_rs_sys::whisper_set_mel_with_state(
                self.ctx.ctx,
                self.ptr,
                data.as_ptr(),
                n_len as c_int,
                80 as c_int,
            )
        };
        if ret == -1 {
            Err(WhisperError::InvalidMelBands)
        } else if ret == 0 {
            Ok(())
        } else {
            Err(WhisperError::GenericError(ret))
        }
    }

    /// Run the Whisper encoder on the log mel spectrogram stored inside the provided whisper state.
    /// Make sure to call [WhisperState::pcm_to_mel] or [WhisperState::set_mel] first.
    ///
    /// # Arguments
    /// * offset: Can be used to specify the offset of the first frame in the spectrogram. Usually 0.
    /// * threads: How many threads to use. Defaults to 1. Must be at least 1, returns an error otherwise.
    ///
    /// # Returns
    /// Ok(()) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_encode(struct whisper_context * ctx, int offset, int n_threads)`
    pub fn encode(&mut self, offset: usize, threads: usize) -> Result<(), WhisperError> {
        if threads < 1 {
            return Err(WhisperError::InvalidThreadCount);
        }
        let ret = unsafe {
            whisper_rs_sys::whisper_encode_with_state(
                self.ctx.ctx,
                self.ptr,
                offset as c_int,
                threads as c_int,
            )
        };
        if ret == -1 {
            Err(WhisperError::UnableToCalculateEvaluation)
        } else if ret == 0 {
            Ok(())
        } else {
            Err(WhisperError::GenericError(ret))
        }
    }

    /// Run the Whisper decoder to obtain the logits and probabilities for the next token.
    /// Make sure to call [WhisperState::encode] first.
    /// tokens + n_tokens is the provided context for the decoder.
    ///
    /// # Arguments
    /// * tokens: The tokens to decode.
    /// * n_tokens: The number of tokens to decode.
    /// * n_past: The number of past tokens to use for the decoding.
    /// * n_threads: How many threads to use. Defaults to 1. Must be at least 1, returns an error otherwise.
    ///
    /// # Returns
    /// Ok(()) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_decode(struct whisper_context * ctx, const whisper_token * tokens, int n_tokens, int n_past, int n_threads)`
    pub fn decode(
        &mut self,
        tokens: &[WhisperTokenId],
        n_past: usize,
        threads: usize,
    ) -> Result<(), WhisperError> {
        if threads < 1 {
            return Err(WhisperError::InvalidThreadCount);
        }
        let ret = unsafe {
            whisper_rs_sys::whisper_decode_with_state(
                self.ctx.ctx,
                self.ptr,
                tokens.as_ptr(),
                tokens.len() as c_int,
                n_past as c_int,
                threads as c_int,
            )
        };
        if ret == -1 {
            Err(WhisperError::UnableToCalculateEvaluation)
        } else if ret == 0 {
            Ok(())
        } else {
            Err(WhisperError::GenericError(ret))
        }
    }

    // Language functions
    /// Use mel data at offset_ms to try and auto-detect the spoken language
    /// Make sure to call [`Self::pcm_to_mel`] or [`Self::set_mel`] first
    ///
    /// # Arguments
    /// * `offset_ms`: The offset in milliseconds to use for the language detection.
    /// * `n_threads`: How many threads to use. Defaults to 1. Must be at least 1, returns an error otherwise.
    ///
    /// # Returns
    /// `Ok((i32, Vec<f32>))` on success where the i32 is detected language id and Vec<f32>
    /// is array with the probabilities of all languages, `Err(WhisperError)` on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_lang_auto_detect(struct whisper_context * ctx, int offset_ms, int n_threads, float * lang_probs)`
    pub fn lang_detect(
        &self,
        offset_ms: usize,
        threads: usize,
    ) -> Result<(i32, Vec<f32>), WhisperError> {
        if threads < 1 {
            return Err(WhisperError::InvalidThreadCount);
        }

        let mut lang_probs: Vec<f32> = vec![0.0; crate::standalone::get_lang_max_id() as usize + 1];
        let ret = unsafe {
            whisper_rs_sys::whisper_lang_auto_detect_with_state(
                self.ctx.ctx,
                self.ptr,
                offset_ms as c_int,
                threads as c_int,
                lang_probs.as_mut_ptr(),
            )
        };
        if ret < 0 {
            Err(WhisperError::GenericError(ret))
        } else {
            Ok((ret as i32, lang_probs))
        }
    }

    // logit functions
    /// Gets logits obtained from the last call to [WhisperState::decode].
    /// As of whisper.cpp 1.4.1, only a single row of logits is available, corresponding to the last token in the input.
    ///
    /// # Returns
    /// A slice of logits with length equal to n_vocab.
    ///
    /// # C++ equivalent
    /// `float * whisper_get_logits(struct whisper_context * ctx)`
    pub fn get_logits(&self) -> Result<&[f32], WhisperError> {
        let ret = unsafe { whisper_rs_sys::whisper_get_logits_from_state(self.ptr) };
        if ret.is_null() {
            return Err(WhisperError::NullPointer);
        }
        let n_vocab = self.n_vocab();
        Ok(unsafe { std::slice::from_raw_parts(ret, n_vocab as usize) })
    }

    // model attributes
    /// Get the mel spectrogram length.
    ///
    /// # Returns
    /// Ok(c_int) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_n_len_from_state(struct whisper_context * ctx)`
    pub fn n_len(&self) -> c_int {
        unsafe { whisper_rs_sys::whisper_n_len_from_state(self.ptr) }
    }

    /// Get n_vocab.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_n_vocab        (struct whisper_context * ctx)`
    pub fn n_vocab(&self) -> c_int {
        unsafe { whisper_rs_sys::whisper_n_vocab(self.ctx.ctx) }
    }

    /// Run the entire model: PCM -> log mel spectrogram -> encoder -> decoder -> text
    /// Uses the specified decoding strategy to obtain the text.
    ///
    /// This is usually the only function you need to call as an end user.
    ///
    /// # Arguments
    /// * params: [crate::FullParams] struct.
    /// * pcm: raw PCM audio data, 32 bit floating point at a sample rate of 16 kHz, 1 channel.
    ///   See utilities in the root of this crate for functions to convert audio to this format.
    ///
    /// # Returns
    /// Ok(c_int) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_full_with_state(
    ///                 struct whisper_context * ctx,
    ///                   struct whisper_state * state,
    ///             struct whisper_full_params   params,
    ///                            const float * samples,
    ///                                    int   n_samples)`
    pub fn full(&mut self, params: FullParams, data: &[f32]) -> Result<c_int, WhisperError> {
        if data.is_empty() {
            // can randomly trigger segmentation faults if we don't check this
            return Err(WhisperError::NoSamples);
        }

        let ret = unsafe {
            whisper_rs_sys::whisper_full_with_state(
                self.ctx.ctx,
                self.ptr,
                params.fp,
                data.as_ptr(),
                data.len() as c_int,
            )
        };
        if ret == -1 {
            Err(WhisperError::UnableToCalculateSpectrogram)
        } else if ret == 7 {
            Err(WhisperError::FailedToEncode)
        } else if ret == 8 {
            Err(WhisperError::FailedToDecode)
        } else if ret == 0 {
            Ok(ret)
        } else {
            Err(WhisperError::GenericError(ret))
        }
    }

    /// Number of generated text segments.
    /// A segment can be a few words, a sentence, or even a paragraph.
    ///
    /// # C++ equivalent
    /// `int whisper_full_n_segments(struct whisper_context * ctx)`
    pub fn full_n_segments(&self) -> c_int {
        unsafe { whisper_rs_sys::whisper_full_n_segments_from_state(self.ptr) }
    }

    /// Language ID associated with the provided state.
    ///
    /// # C++ equivalent
    /// `int whisper_full_lang_id_from_state(struct whisper_state * state);`
    pub fn full_lang_id_from_state(&self) -> c_int {
        unsafe { whisper_rs_sys::whisper_full_lang_id_from_state(self.ptr) }
    }

    fn segment_in_bounds(&self, segment: c_int) -> bool {
        segment >= 0 && segment < self.full_n_segments()
    }

    /// Get a [`WhisperSegment`] object for the specified segment index.
    ///
    /// # Returns
    /// `Some(WhisperSegment)` if `segment` is in bounds, otherwise [`None`].
    pub fn get_segment(&self, segment: c_int) -> Option<WhisperSegment<'_>> {
        self.segment_in_bounds(segment)
            .then(|| unsafe { WhisperSegment::new_unchecked(self, segment) })
    }

    /// Get a [`WhisperSegment`] object for the specified segment index.
    ///
    /// # Safety
    /// You must ensure `segment` is in bounds for this [`WhisperState`].
    pub unsafe fn get_segment_unchecked(&self, segment: c_int) -> WhisperSegment<'_> {
        WhisperSegment::new_unchecked(self, segment)
    }

    /// Get an iterator over all segments.
    pub fn as_iter(&self) -> WhisperStateSegmentIterator<'_> {
        WhisperStateSegmentIterator::new(self)
    }
}
