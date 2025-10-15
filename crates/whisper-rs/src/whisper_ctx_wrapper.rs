use std::borrow::Cow;
use std::ffi::{c_int, CStr};
use std::sync::Arc;

use crate::{
    WhisperContextParameters, WhisperError, WhisperInnerContext, WhisperState, WhisperTokenId,
};

pub struct WhisperContext {
    ctx: Arc<WhisperInnerContext>,
}

impl WhisperContext {
    fn wrap(ctx: WhisperInnerContext) -> Self {
        Self { ctx: Arc::new(ctx) }
    }

    /// Create a new WhisperContext from a file, with parameters.
    ///
    /// # Arguments
    /// * path: The path to the model file.
    /// * parameters: A parameter struct containing the parameters to use.
    ///
    /// # Returns
    /// Ok(Self) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `struct whisper_context * whisper_init_from_file_with_params_no_state(const char * path_model, struct whisper_context_params params);`
    pub fn new_with_params(
        path: &str,
        parameters: WhisperContextParameters,
    ) -> Result<Self, WhisperError> {
        let ctx = WhisperInnerContext::new_with_params(path, parameters)?;
        Ok(Self::wrap(ctx))
    }

    /// Create a new WhisperContext from a buffer.
    ///
    /// # Arguments
    /// * buffer: The buffer containing the model.
    ///
    /// # Returns
    /// Ok(Self) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `struct whisper_context * whisper_init_from_buffer_with_params_no_state(void * buffer, size_t buffer_size, struct whisper_context_params params);`
    pub fn new_from_buffer_with_params(
        buffer: &[u8],
        parameters: WhisperContextParameters,
    ) -> Result<Self, WhisperError> {
        let ctx = WhisperInnerContext::new_from_buffer_with_params(buffer, parameters)?;
        Ok(Self::wrap(ctx))
    }

    /// Convert the provided text into tokens.
    ///
    /// # Arguments
    /// * text: The text to convert.
    ///
    /// # Returns
    /// `Ok(Vec<WhisperTokenId>)` on success, `Err(WhisperError)` on failure.
    ///
    /// # C++ equivalent
    /// `int whisper_tokenize(struct whisper_context * ctx, const char * text, whisper_token * tokens, int n_max_tokens);`
    pub fn tokenize(
        &self,
        text: &str,
        max_tokens: usize,
    ) -> Result<Vec<WhisperTokenId>, WhisperError> {
        self.ctx.tokenize(text, max_tokens)
    }

    /// Get n_vocab.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_n_vocab        (struct whisper_context * ctx)`
    pub fn n_vocab(&self) -> c_int {
        self.ctx.n_vocab()
    }

    /// Get n_text_ctx.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_n_text_ctx     (struct whisper_context * ctx);`
    pub fn n_text_ctx(&self) -> c_int {
        self.ctx.n_text_ctx()
    }

    /// Get n_audio_ctx.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_n_audio_ctx     (struct whisper_context * ctx);`
    pub fn n_audio_ctx(&self) -> c_int {
        self.ctx.n_audio_ctx()
    }

    /// Does this model support multiple languages?
    ///
    /// # C++ equivalent
    /// `int whisper_is_multilingual(struct whisper_context * ctx)`
    pub fn is_multilingual(&self) -> bool {
        self.ctx.is_multilingual()
    }

    /// Get model_n_vocab.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_vocab      (struct whisper_context * ctx);`
    pub fn model_n_vocab(&self) -> c_int {
        self.ctx.model_n_vocab()
    }

    /// Get model_n_audio_ctx.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_audio_ctx    (struct whisper_context * ctx)`
    pub fn model_n_audio_ctx(&self) -> c_int {
        self.ctx.model_n_audio_ctx()
    }

    /// Get model_n_audio_state.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_audio_state(struct whisper_context * ctx);`
    pub fn model_n_audio_state(&self) -> c_int {
        self.ctx.model_n_audio_state()
    }

    /// Get model_n_audio_head.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_audio_head (struct whisper_context * ctx);`
    pub fn model_n_audio_head(&self) -> c_int {
        self.ctx.model_n_audio_head()
    }

    /// Get model_n_audio_layer.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_audio_layer(struct whisper_context * ctx);`
    pub fn model_n_audio_layer(&self) -> c_int {
        self.ctx.model_n_audio_layer()
    }

    /// Get model_n_text_ctx.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_text_ctx     (struct whisper_context * ctx)`
    pub fn model_n_text_ctx(&self) -> c_int {
        self.ctx.model_n_text_ctx()
    }

    /// Get model_n_text_state.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_text_state (struct whisper_context * ctx);`
    pub fn model_n_text_state(&self) -> c_int {
        self.ctx.model_n_text_state()
    }

    /// Get model_n_text_head.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_text_head  (struct whisper_context * ctx);`
    pub fn model_n_text_head(&self) -> c_int {
        self.ctx.model_n_text_head()
    }

    /// Get model_n_text_layer.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_text_layer (struct whisper_context * ctx);`
    pub fn model_n_text_layer(&self) -> c_int {
        self.ctx.model_n_text_layer()
    }

    /// Get model_n_mels.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_n_mels       (struct whisper_context * ctx);`
    pub fn model_n_mels(&self) -> c_int {
        self.ctx.model_n_mels()
    }

    /// Get model_ftype.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_ftype          (struct whisper_context * ctx);`
    pub fn model_ftype(&self) -> c_int {
        self.ctx.model_ftype()
    }

    /// Get model_type.
    ///
    /// # Returns
    /// c_int
    ///
    /// # C++ equivalent
    /// `int whisper_model_type         (struct whisper_context * ctx);`
    pub fn model_type(&self) -> c_int {
        self.ctx.model_type()
    }

    // --- begin model_type_readable ---
    /// Undocumented but exposed function in the C++ API.
    ///
    /// # Returns
    /// * On success: `Ok(&[u8])`
    /// * On error: `Err(WhisperError::NullPointer)`
    ///
    /// # C++ equivalent
    /// `const char * whisper_model_type_readable(struct whisper_context * ctx);`
    pub fn model_type_readable_bytes(&self) -> Result<&[u8], WhisperError> {
        self.ctx.model_type_readable_bytes()
    }
    /// Undocumented but exposed function in the C++ API.
    ///
    /// # Returns
    /// * On success: `Ok(&str)`
    /// * On error: `Err(WhisperError::NullPointer)` or `Err(WhisperError::InvalidUtf8)`
    ///
    /// # C++ equivalent
    /// `const char * whisper_model_type_readable(struct whisper_context * ctx);`
    pub fn model_type_readable_str(&self) -> Result<&str, WhisperError> {
        self.ctx.model_type_readable_str()
    }

    /// Undocumented but exposed function in the C++ API.
    ///
    /// This function differs from [`Self::model_type_readable_str`] in that it ignores invalid UTF-8 bytes in the input,
    /// and instead replaces them with the Unicode replacement character.
    ///
    /// # Returns
    /// * On success: `Ok(Cow<str>)`
    /// * On error: `Err(WhisperError::NullPointer)`
    ///
    /// # C++ equivalent
    /// `const char * whisper_model_type_readable(struct whisper_context * ctx);`
    pub fn model_type_readable_str_lossy(&self) -> Result<Cow<'_, str>, WhisperError> {
        self.ctx.model_type_readable_str_lossy()
    }
    // --- end model_type_readable ---

    // --- begin token functions ---
    /// Convert a token ID to a byte array.
    ///
    /// **Danger**: this function is liable to throw a C++ exception if you pass an out-of-bounds index.
    /// There is no way to check if your index is in bounds from Rust.
    /// C++ exceptions *cannot* be caught and *will* cause the Rust runtime to abort your program.
    /// Use this function and its siblings with extreme caution.
    ///
    /// # Arguments
    /// * `token_id`: ID of the token.
    ///
    /// # Returns
    /// * On success: `Ok(&[u8])`
    /// * On out-of-bounds index: foreign runtime exception, causing your entire program to abort.
    /// * On other error: `Err(WhisperError::NullPointer)`
    ///
    /// # C++ equivalent
    /// `const char * whisper_token_to_str(struct whisper_context * ctx, whisper_token token)`
    pub fn token_to_bytes(&self, token_id: WhisperTokenId) -> Result<&[u8], WhisperError> {
        self.ctx.token_to_bytes(token_id)
    }

    /// Convert a token ID to a string.
    ///
    /// **Danger**: this function is liable to throw a C++ exception if you pass an out-of-bounds index.
    /// See [`Self::token_to_bytes`] for more information.
    ///
    /// # Arguments
    /// * `token_id`: ID of the token.
    ///
    /// # Returns
    /// * On success: `Ok(&str)`
    /// * On out-of-bounds index: foreign runtime exception, causing your entire program to abort.
    /// * On other error: `Err(WhisperError::NullPointer)` or `Err(WhisperError::InvalidUtf8)`
    ///
    /// # C++ equivalent
    /// `const char * whisper_token_to_str(struct whisper_context * ctx, whisper_token token)`
    pub fn token_to_str(&self, token_id: WhisperTokenId) -> Result<&str, WhisperError> {
        self.ctx.token_to_str(token_id)
    }

    /// Convert a token ID to a string.
    ///
    /// This function differs from [`Self::token_to_str`] in that it ignores invalid UTF-8 bytes in the input,
    /// and instead replaces them with the Unicode replacement character.
    ///
    /// **Danger**: this function is liable to throw a C++ exception if you pass an out-of-bounds index.
    /// See [`Self::token_to_bytes`] for more information.
    ///
    /// # Arguments
    /// * `token_id`: ID of the token.
    ///
    /// # Returns
    /// * On success: `Ok(Cow<str>)`
    /// * On out-of-bounds index: foreign runtime exception, causing your entire program to abort.
    /// * On other error: `Err(WhisperError::NullPointer)`
    ///
    /// # C++ equivalent
    /// `const char * whisper_token_to_str(struct whisper_context * ctx, whisper_token token)`
    pub fn token_to_str_lossy(
        &self,
        token_id: WhisperTokenId,
    ) -> Result<Cow<'_, str>, WhisperError> {
        self.ctx.token_to_str_lossy(token_id)
    }

    /// Get the ID of the eot token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_eot (struct whisper_context * ctx)`
    pub fn token_eot(&self) -> WhisperTokenId {
        self.ctx.token_eot()
    }

    /// Get the ID of the sot token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_sot (struct whisper_context * ctx)`
    pub fn token_sot(&self) -> WhisperTokenId {
        self.ctx.token_sot()
    }

    /// Get the ID of the solm token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_solm(struct whisper_context * ctx)`
    pub fn token_solm(&self) -> WhisperTokenId {
        self.ctx.token_solm()
    }

    /// Get the ID of the prev token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_prev(struct whisper_context * ctx)`
    pub fn token_prev(&self) -> WhisperTokenId {
        self.ctx.token_prev()
    }

    /// Get the ID of the nosp token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_nosp(struct whisper_context * ctx)`
    pub fn token_nosp(&self) -> WhisperTokenId {
        self.ctx.token_nosp()
    }

    /// Get the ID of the not token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_not (struct whisper_context * ctx)`
    pub fn token_not(&self) -> WhisperTokenId {
        self.ctx.token_not()
    }

    /// Get the ID of the beg token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_beg (struct whisper_context * ctx)`
    pub fn token_beg(&self) -> WhisperTokenId {
        self.ctx.token_beg()
    }

    /// Get the ID of a specified language token
    ///
    /// # Arguments
    /// * lang_id: ID of the language
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_lang(struct whisper_context * ctx, int lang_id)`
    pub fn token_lang(&self, lang_id: c_int) -> WhisperTokenId {
        self.ctx.token_lang(lang_id)
    }
    // --- end token functions ---

    /// Print performance statistics to stderr.
    ///
    /// # C++ equivalent
    /// `void whisper_print_timings(struct whisper_context * ctx)`
    pub fn print_timings(&self) {
        self.ctx.print_timings()
    }

    /// Reset performance statistics.
    ///
    /// # C++ equivalent
    /// `void whisper_reset_timings(struct whisper_context * ctx)`
    pub fn reset_timings(&self) {
        self.ctx.reset_timings()
    }

    // task tokens
    /// Get the ID of the translate task token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_translate ()`
    pub fn token_translate(&self) -> WhisperTokenId {
        self.ctx.token_translate()
    }

    /// Get the ID of the transcribe task token.
    ///
    /// # C++ equivalent
    /// `whisper_token whisper_token_transcribe()`
    pub fn token_transcribe(&self) -> WhisperTokenId {
        self.ctx.token_transcribe()
    }

    // we don't implement `whisper_init()` here since i have zero clue what `whisper_model_loader` does

    /// Create a new state object, ready for use.
    ///
    /// # Returns
    /// Ok(WhisperState) on success, Err(WhisperError) on failure.
    ///
    /// # C++ equivalent
    /// `struct whisper_state * whisper_init_state(struct whisper_context * ctx);`
    pub fn create_state(&self) -> Result<WhisperState, WhisperError> {
        let state = unsafe { whisper_rs_sys::whisper_init_state(self.ctx.ctx) };
        if state.is_null() {
            Err(WhisperError::InitError)
        } else {
            // SAFETY: this is known to be a valid pointer to a `whisper_state` struct
            Ok(unsafe { WhisperState::new(self.ctx.clone(), state) })
        }
    }
}
