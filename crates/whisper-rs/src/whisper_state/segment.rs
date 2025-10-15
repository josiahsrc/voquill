use crate::{WhisperError, WhisperState, WhisperTokenData, WhisperTokenId};
use std::borrow::Cow;
use std::ffi::{c_int, CStr};
use std::fmt;

/// A segment returned by Whisper after running the transcription pipeline.
pub struct WhisperSegment<'a> {
    state: &'a WhisperState,

    segment_idx: c_int,
    token_count: c_int,
}
impl<'a> WhisperSegment<'a> {
    /// # Safety
    /// You must ensure `segment_idx` is in bounds for the linked [`WhisperState`].
    pub(super) unsafe fn new_unchecked(state: &'a WhisperState, segment_idx: c_int) -> Self {
        assert!(
            state.segment_in_bounds(segment_idx),
            "tried to create a WhisperSegment out of bounds for linked state"
        );
        Self {
            state,
            segment_idx,
            token_count: unsafe {
                whisper_rs_sys::whisper_full_n_tokens_from_state(state.ptr, segment_idx)
            },
        }
    }

    /// Get the start time of the specified segment.
    ///
    /// # Returns
    /// Start time in centiseconds (10s of milliseconds)
    ///
    /// # C++ equivalent
    /// `int64_t whisper_full_get_segment_t0(struct whisper_context * ctx, int i_segment)`
    pub fn start_timestamp(&self) -> i64 {
        unsafe {
            whisper_rs_sys::whisper_full_get_segment_t0_from_state(self.state.ptr, self.segment_idx)
        }
    }

    /// Get the end time of the specified segment.
    ///
    /// # Returns
    /// End time in centiseconds (10s of milliseconds)
    ///
    /// # C++ equivalent
    /// `int64_t whisper_full_get_segment_t1(struct whisper_context * ctx, int i_segment)`
    pub fn end_timestamp(&self) -> i64 {
        unsafe {
            whisper_rs_sys::whisper_full_get_segment_t1_from_state(self.state.ptr, self.segment_idx)
        }
    }

    /// Get number of tokens in this segment.
    ///
    /// # Returns
    /// `c_int`
    ///
    /// # C++ equivalent
    /// `int whisper_full_n_tokens(struct whisper_context * ctx, int i_segment)`
    pub fn n_tokens(&self) -> c_int {
        self.token_count
    }

    /// Get whether the next segment is predicted as a speaker turn.
    ///
    /// # Returns
    /// `bool`
    ///
    /// # C++ equivalent
    /// `bool whisper_full_get_segment_speaker_turn_next_from_state(struct whisper_state * state, int i_segment)`
    pub fn next_segment_speaker_turn(&self) -> bool {
        unsafe {
            whisper_rs_sys::whisper_full_get_segment_speaker_turn_next_from_state(
                self.state.ptr,
                self.segment_idx,
            )
        }
    }

    /// Get the no_speech probability for the specified segment.
    ///
    /// # Returns
    /// `f32`
    ///
    /// # C++ equivalent
    /// `float whisper_full_get_segment_no_speech_prob_from_state(struct whisper_state * state, int i_segment)`
    pub fn no_speech_probability(&self) -> f32 {
        unsafe {
            whisper_rs_sys::whisper_full_get_segment_no_speech_prob_from_state(
                self.state.ptr,
                self.segment_idx,
            )
        }
    }

    fn to_raw_cstr(&self) -> Result<&CStr, WhisperError> {
        let ret = unsafe {
            whisper_rs_sys::whisper_full_get_segment_text_from_state(
                self.state.ptr,
                self.segment_idx,
            )
        };
        if ret.is_null() {
            return Err(WhisperError::NullPointer);
        }
        Ok(unsafe { CStr::from_ptr(ret) })
    }

    /// Get the raw bytes of this segment.
    ///
    /// # Returns
    /// * On success: The raw bytes, with no null terminator
    /// * On failure: [`WhisperError::NullPointer`]
    ///
    /// # C++ equivalent
    /// `const char * whisper_full_get_segment_text(struct whisper_context * ctx, int i_segment)`
    pub fn to_bytes(&self) -> Result<&[u8], WhisperError> {
        Ok(self.to_raw_cstr()?.to_bytes())
    }

    /// Get the text of this segment.
    ///
    /// # Returns
    /// * On success: the UTF-8 validated string.
    /// * On failure: [`WhisperError::NullPointer`] or [`WhisperError::InvalidUtf8`]
    ///
    /// # C++ equivalent
    /// `const char * whisper_full_get_segment_text(struct whisper_context * ctx, int i_segment)`
    pub fn to_str(&self) -> Result<&str, WhisperError> {
        Ok(self.to_raw_cstr()?.to_str()?)
    }

    /// Get the text of this segment.
    ///
    /// This function differs from [`Self::to_str`]
    /// in that it ignores invalid UTF-8 in strings,
    /// and instead replaces it with the replacement character.
    ///
    /// # Returns
    /// * On success: The valid string, with any invalid UTF-8 replaced with the replacement character
    /// * On failure: [`WhisperError::NullPointer`]
    ///
    /// # C++ equivalent
    /// `const char * whisper_full_get_segment_text(struct whisper_context * ctx, int i_segment)`
    pub fn to_str_lossy(&self) -> Result<Cow<'_, str>, WhisperError> {
        Ok(self.to_raw_cstr()?.to_string_lossy())
    }

    fn token_in_bounds(&self, token_idx: c_int) -> bool {
        token_idx >= 0 && token_idx < self.token_count
    }

    /// Get the token at the specified index. Returns `None` if out of bounds for this state.
    pub fn get_token(&self, token: c_int) -> Option<WhisperToken<'_, '_>> {
        self.token_in_bounds(token)
            // SAFETY: we've just asserted that this token is in bounds
            .then(|| unsafe { WhisperToken::new_unchecked(self, token) })
    }

    /// The same as [`Self::get_token`] but without any bounds check.
    ///
    /// # Safety
    /// You must ensure `token` is in bounds for this [`WhisperSegment`].
    /// If it is not, this is immediate Undefined Behaviour.
    pub unsafe fn get_token_unchecked(&self, token: c_int) -> WhisperToken<'_, '_> {
        WhisperToken::new_unchecked(self, token)
    }
}

/// Write the contents of this segment to the output.
/// This will panic if Whisper returns a null pointer.
///
/// Uses [`Self::to_str_lossy`] internally.
impl fmt::Display for WhisperSegment<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            self.to_str_lossy()
                .expect("got null pointer during string write")
        )
    }
}

impl fmt::Debug for WhisperSegment<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("WhisperSegment")
            .field("segment", &self.segment_idx)
            .field("n_tokens", &self.token_count)
            .field("start_ts", &self.start_timestamp())
            .field("end_ts", &self.end_timestamp())
            .field(
                "next_segment_speaker_turn",
                &self.next_segment_speaker_turn(),
            )
            .field("no_speech_probability", &self.no_speech_probability())
            .field("text", &self.to_str_lossy())
            .finish_non_exhaustive()
    }
}

pub struct WhisperToken<'a, 'b: 'a> {
    segment: &'a WhisperSegment<'b>,
    token_idx: c_int,
}

impl<'a, 'b> WhisperToken<'a, 'b> {
    /// # Safety
    /// You must ensure `token_idx` is in bounds for this [`WhisperSegment`].
    unsafe fn new_unchecked(segment: &'a WhisperSegment<'b>, token_idx: c_int) -> Self {
        Self { segment, token_idx }
    }

    /// Get the token ID of this token in its segment.
    ///
    /// # Returns
    /// [`WhisperTokenId`]
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_full_get_token_id(struct whisper_context * ctx, int i_segment, int i_token)`
    pub fn token_id(&self) -> WhisperTokenId {
        unsafe {
            whisper_rs_sys::whisper_full_get_token_id_from_state(
                self.segment.state.ptr,
                self.segment.segment_idx,
                self.token_idx,
            )
        }
    }

    /// Get token data for this token in its segment.
    ///
    /// # Returns
    /// [`WhisperTokenData`]
    ///
    /// # C++ equivalent
    /// `whisper_token_data whisper_full_get_token_data(struct whisper_context * ctx, int i_segment, int i_token)`
    pub fn token_data(&self) -> WhisperTokenData {
        unsafe {
            whisper_rs_sys::whisper_full_get_token_data_from_state(
                self.segment.state.ptr,
                self.segment.segment_idx,
                self.token_idx,
            )
        }
    }

    /// Get the probability of this token in its segment.
    ///
    /// # Returns
    /// `f32`
    ///
    /// # C++ equivalent
    /// `float whisper_full_get_token_p(struct whisper_context * ctx, int i_segment, int i_token)`
    pub fn token_probability(&self) -> f32 {
        unsafe {
            whisper_rs_sys::whisper_full_get_token_p_from_state(
                self.segment.state.ptr,
                self.segment.segment_idx,
                self.token_idx,
            )
        }
    }

    fn to_raw_cstr(&self) -> Result<&CStr, WhisperError> {
        let ret = unsafe {
            whisper_rs_sys::whisper_full_get_token_text_from_state(
                self.segment.state.ctx.ctx,
                self.segment.state.ptr,
                self.segment.segment_idx,
                self.token_idx,
            )
        };
        if ret.is_null() {
            return Err(WhisperError::NullPointer);
        }
        Ok(unsafe { CStr::from_ptr(ret) })
    }

    /// Get the raw bytes of this token.
    ///
    /// Useful if you're using a language for which Whisper is known to split tokens
    /// away from UTF-8 character boundaries.
    ///
    /// # Returns
    /// * On success: The raw bytes, with no null terminator
    /// * On failure: [`WhisperError::NullPointer`]
    ///
    /// # C++ equivalent
    /// `const char * whisper_full_get_token_text(struct whisper_context * ctx, int i_segment, int i_token)`
    pub fn to_bytes(&self) -> Result<&[u8], WhisperError> {
        Ok(self.to_raw_cstr()?.to_bytes())
    }

    /// Get the text of this token.
    ///
    /// # Returns
    /// * On success: the UTF-8 validated string.
    /// * On failure: [`WhisperError::NullPointer`] or [`WhisperError::InvalidUtf8`]
    ///
    /// # C++ equivalent
    /// `const char * whisper_full_get_token_text(struct whisper_context * ctx, int i_segment, int i_token)`
    pub fn to_str(&self) -> Result<&str, WhisperError> {
        Ok(self.to_raw_cstr()?.to_str()?)
    }

    /// Get the text of this token.
    ///
    /// This function differs from [`Self::to_str`]
    /// in that it ignores invalid UTF-8 in strings,
    /// and instead replaces it with the replacement character.
    ///
    /// # Returns
    /// * On success: The valid string, with any invalid UTF-8 replaced with the replacement character
    /// * On failure: [`WhisperError::NullPointer`]
    ///
    /// # C++ equivalent
    /// `const char * whisper_full_get_token_text(struct whisper_context * ctx, int i_segment, int i_token)`
    pub fn to_str_lossy(&self) -> Result<Cow<'_, str>, WhisperError> {
        Ok(self.to_raw_cstr()?.to_string_lossy())
    }
}

/// Write the contents of this token to the output.
/// This will panic if Whisper returns a null pointer.
///
/// Uses [`Self::to_str_lossy`] internally.
impl fmt::Display for WhisperToken<'_, '_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            self.to_str_lossy()
                .expect("got null pointer during string write")
        )
    }
}

impl fmt::Debug for WhisperToken<'_, '_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("WhisperToken")
            .field("segment_idx", &self.segment.segment_idx)
            .field("token_idx", &self.token_idx)
            .field("token_id", &self.token_id())
            .field("token_data", &self.token_data())
            .field("token_probability", &self.token_probability())
            .finish()
    }
}
