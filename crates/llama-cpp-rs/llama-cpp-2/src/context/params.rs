//! A safe wrapper around `llama_context_params`.
use std::fmt::Debug;
use std::num::NonZeroU32;

/// A rusty wrapper around `rope_scaling_type`.
#[repr(i8)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum RopeScalingType {
    /// The scaling type is unspecified
    Unspecified = -1,
    /// No scaling
    None = 0,
    /// Linear scaling
    Linear = 1,
    /// Yarn scaling
    Yarn = 2,
}

/// Create a `RopeScalingType` from a `c_int` - returns `RopeScalingType::ScalingUnspecified` if
/// the value is not recognized.
impl From<i32> for RopeScalingType {
    fn from(value: i32) -> Self {
        match value {
            0 => Self::None,
            1 => Self::Linear,
            2 => Self::Yarn,
            _ => Self::Unspecified,
        }
    }
}

/// Create a `c_int` from a `RopeScalingType`.
impl From<RopeScalingType> for i32 {
    fn from(value: RopeScalingType) -> Self {
        match value {
            RopeScalingType::None => 0,
            RopeScalingType::Linear => 1,
            RopeScalingType::Yarn => 2,
            RopeScalingType::Unspecified => -1,
        }
    }
}

/// A rusty wrapper around `LLAMA_POOLING_TYPE`.
#[repr(i8)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum LlamaPoolingType {
    /// The pooling type is unspecified
    Unspecified = -1,
    /// No pooling
    None = 0,
    /// Mean pooling
    Mean = 1,
    /// CLS pooling
    Cls = 2,
    /// Last pooling
    Last = 3,
    /// Rank pooling
    Rank = 4,
}

/// Create a `LlamaPoolingType` from a `c_int` - returns `LlamaPoolingType::Unspecified` if
/// the value is not recognized.
impl From<i32> for LlamaPoolingType {
    fn from(value: i32) -> Self {
        match value {
            0 => Self::None,
            1 => Self::Mean,
            2 => Self::Cls,
            3 => Self::Last,
            4 => Self::Rank,
            _ => Self::Unspecified,
        }
    }
}

/// Create a `c_int` from a `LlamaPoolingType`.
impl From<LlamaPoolingType> for i32 {
    fn from(value: LlamaPoolingType) -> Self {
        match value {
            LlamaPoolingType::None => 0,
            LlamaPoolingType::Mean => 1,
            LlamaPoolingType::Cls => 2,
            LlamaPoolingType::Last => 3,
            LlamaPoolingType::Rank => 4,
            LlamaPoolingType::Unspecified => -1,
        }
    }
}

/// A rusty wrapper around `ggml_type` for KV cache types.
#[allow(non_camel_case_types, missing_docs)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum KvCacheType {
    /// Represents an unknown or not-yet-mapped `ggml_type` and carries the raw value.
    /// When passed through FFI, the raw value is used as-is (if llama.cpp supports it,
    /// the runtime will operate with that type).
    /// This variant preserves API compatibility when new `ggml_type` values are
    /// introduced in the future.
    Unknown(llama_cpp_sys_2::ggml_type),
    F32,
    F16,
    Q4_0,
    Q4_1,
    Q5_0,
    Q5_1,
    Q8_0,
    Q8_1,
    Q2_K,
    Q3_K,
    Q4_K,
    Q5_K,
    Q6_K,
    Q8_K,
    IQ2_XXS,
    IQ2_XS,
    IQ3_XXS,
    IQ1_S,
    IQ4_NL,
    IQ3_S,
    IQ2_S,
    IQ4_XS,
    I8,
    I16,
    I32,
    I64,
    F64,
    IQ1_M,
    BF16,
    TQ1_0,
    TQ2_0,
    MXFP4,
}

impl From<KvCacheType> for llama_cpp_sys_2::ggml_type {
    fn from(value: KvCacheType) -> Self {
        match value {
            KvCacheType::Unknown(raw) => raw,
            KvCacheType::F32 => llama_cpp_sys_2::GGML_TYPE_F32,
            KvCacheType::F16 => llama_cpp_sys_2::GGML_TYPE_F16,
            KvCacheType::Q4_0 => llama_cpp_sys_2::GGML_TYPE_Q4_0,
            KvCacheType::Q4_1 => llama_cpp_sys_2::GGML_TYPE_Q4_1,
            KvCacheType::Q5_0 => llama_cpp_sys_2::GGML_TYPE_Q5_0,
            KvCacheType::Q5_1 => llama_cpp_sys_2::GGML_TYPE_Q5_1,
            KvCacheType::Q8_0 => llama_cpp_sys_2::GGML_TYPE_Q8_0,
            KvCacheType::Q8_1 => llama_cpp_sys_2::GGML_TYPE_Q8_1,
            KvCacheType::Q2_K => llama_cpp_sys_2::GGML_TYPE_Q2_K,
            KvCacheType::Q3_K => llama_cpp_sys_2::GGML_TYPE_Q3_K,
            KvCacheType::Q4_K => llama_cpp_sys_2::GGML_TYPE_Q4_K,
            KvCacheType::Q5_K => llama_cpp_sys_2::GGML_TYPE_Q5_K,
            KvCacheType::Q6_K => llama_cpp_sys_2::GGML_TYPE_Q6_K,
            KvCacheType::Q8_K => llama_cpp_sys_2::GGML_TYPE_Q8_K,
            KvCacheType::IQ2_XXS => llama_cpp_sys_2::GGML_TYPE_IQ2_XXS,
            KvCacheType::IQ2_XS => llama_cpp_sys_2::GGML_TYPE_IQ2_XS,
            KvCacheType::IQ3_XXS => llama_cpp_sys_2::GGML_TYPE_IQ3_XXS,
            KvCacheType::IQ1_S => llama_cpp_sys_2::GGML_TYPE_IQ1_S,
            KvCacheType::IQ4_NL => llama_cpp_sys_2::GGML_TYPE_IQ4_NL,
            KvCacheType::IQ3_S => llama_cpp_sys_2::GGML_TYPE_IQ3_S,
            KvCacheType::IQ2_S => llama_cpp_sys_2::GGML_TYPE_IQ2_S,
            KvCacheType::IQ4_XS => llama_cpp_sys_2::GGML_TYPE_IQ4_XS,
            KvCacheType::I8 => llama_cpp_sys_2::GGML_TYPE_I8,
            KvCacheType::I16 => llama_cpp_sys_2::GGML_TYPE_I16,
            KvCacheType::I32 => llama_cpp_sys_2::GGML_TYPE_I32,
            KvCacheType::I64 => llama_cpp_sys_2::GGML_TYPE_I64,
            KvCacheType::F64 => llama_cpp_sys_2::GGML_TYPE_F64,
            KvCacheType::IQ1_M => llama_cpp_sys_2::GGML_TYPE_IQ1_M,
            KvCacheType::BF16 => llama_cpp_sys_2::GGML_TYPE_BF16,
            KvCacheType::TQ1_0 => llama_cpp_sys_2::GGML_TYPE_TQ1_0,
            KvCacheType::TQ2_0 => llama_cpp_sys_2::GGML_TYPE_TQ2_0,
            KvCacheType::MXFP4 => llama_cpp_sys_2::GGML_TYPE_MXFP4,
        }
    }
}

impl From<llama_cpp_sys_2::ggml_type> for KvCacheType {
    fn from(value: llama_cpp_sys_2::ggml_type) -> Self {
        match value {
            x if x == llama_cpp_sys_2::GGML_TYPE_F32 => KvCacheType::F32,
            x if x == llama_cpp_sys_2::GGML_TYPE_F16 => KvCacheType::F16,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q4_0 => KvCacheType::Q4_0,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q4_1 => KvCacheType::Q4_1,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q5_0 => KvCacheType::Q5_0,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q5_1 => KvCacheType::Q5_1,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q8_0 => KvCacheType::Q8_0,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q8_1 => KvCacheType::Q8_1,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q2_K => KvCacheType::Q2_K,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q3_K => KvCacheType::Q3_K,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q4_K => KvCacheType::Q4_K,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q5_K => KvCacheType::Q5_K,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q6_K => KvCacheType::Q6_K,
            x if x == llama_cpp_sys_2::GGML_TYPE_Q8_K => KvCacheType::Q8_K,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ2_XXS => KvCacheType::IQ2_XXS,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ2_XS => KvCacheType::IQ2_XS,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ3_XXS => KvCacheType::IQ3_XXS,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ1_S => KvCacheType::IQ1_S,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ4_NL => KvCacheType::IQ4_NL,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ3_S => KvCacheType::IQ3_S,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ2_S => KvCacheType::IQ2_S,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ4_XS => KvCacheType::IQ4_XS,
            x if x == llama_cpp_sys_2::GGML_TYPE_I8 => KvCacheType::I8,
            x if x == llama_cpp_sys_2::GGML_TYPE_I16 => KvCacheType::I16,
            x if x == llama_cpp_sys_2::GGML_TYPE_I32 => KvCacheType::I32,
            x if x == llama_cpp_sys_2::GGML_TYPE_I64 => KvCacheType::I64,
            x if x == llama_cpp_sys_2::GGML_TYPE_F64 => KvCacheType::F64,
            x if x == llama_cpp_sys_2::GGML_TYPE_IQ1_M => KvCacheType::IQ1_M,
            x if x == llama_cpp_sys_2::GGML_TYPE_BF16 => KvCacheType::BF16,
            x if x == llama_cpp_sys_2::GGML_TYPE_TQ1_0 => KvCacheType::TQ1_0,
            x if x == llama_cpp_sys_2::GGML_TYPE_TQ2_0 => KvCacheType::TQ2_0,
            x if x == llama_cpp_sys_2::GGML_TYPE_MXFP4 => KvCacheType::MXFP4,
            _ => KvCacheType::Unknown(value),
        }
    }
}

/// A safe wrapper around `llama_context_params`.
///
/// Generally this should be created with [`Default::default()`] and then modified with `with_*` methods.
///
/// # Examples
///
/// ```rust
/// # use std::num::NonZeroU32;
/// use llama_cpp_2::context::params::LlamaContextParams;
///
///let ctx_params = LlamaContextParams::default()
///    .with_n_ctx(NonZeroU32::new(2048));
///
/// assert_eq!(ctx_params.n_ctx(), NonZeroU32::new(2048));
/// ```
#[derive(Debug, Clone)]
#[allow(
    missing_docs,
    clippy::struct_excessive_bools,
    clippy::module_name_repetitions
)]
pub struct LlamaContextParams {
    pub(crate) context_params: llama_cpp_sys_2::llama_context_params,
}

/// SAFETY: we do not currently allow setting or reading the pointers that cause this to not be automatically send or sync.
unsafe impl Send for LlamaContextParams {}
unsafe impl Sync for LlamaContextParams {}

impl LlamaContextParams {
    /// Set the side of the context
    ///
    /// # Examples
    ///
    /// ```rust
    /// # use std::num::NonZeroU32;
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default();
    /// let params = params.with_n_ctx(NonZeroU32::new(2048));
    /// assert_eq!(params.n_ctx(), NonZeroU32::new(2048));
    /// ```
    #[must_use]
    pub fn with_n_ctx(mut self, n_ctx: Option<NonZeroU32>) -> Self {
        self.context_params.n_ctx = n_ctx.map_or(0, std::num::NonZeroU32::get);
        self
    }

    /// Get the size of the context.
    ///
    /// [`None`] if the context size is specified by the model and not the context.
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert_eq!(params.n_ctx(), std::num::NonZeroU32::new(512));
    #[must_use]
    pub fn n_ctx(&self) -> Option<NonZeroU32> {
        NonZeroU32::new(self.context_params.n_ctx)
    }

    /// Set the `n_batch`
    ///
    /// # Examples
    ///
    /// ```rust
    /// # use std::num::NonZeroU32;
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///     .with_n_batch(2048);
    /// assert_eq!(params.n_batch(), 2048);
    /// ```
    #[must_use]
    pub fn with_n_batch(mut self, n_batch: u32) -> Self {
        self.context_params.n_batch = n_batch;
        self
    }

    /// Get the `n_batch`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default();
    /// assert_eq!(params.n_batch(), 2048);
    /// ```
    #[must_use]
    pub fn n_batch(&self) -> u32 {
        self.context_params.n_batch
    }

    /// Set the `n_ubatch`
    ///
    /// # Examples
    ///
    /// ```rust
    /// # use std::num::NonZeroU32;
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///     .with_n_ubatch(512);
    /// assert_eq!(params.n_ubatch(), 512);
    /// ```
    #[must_use]
    pub fn with_n_ubatch(mut self, n_ubatch: u32) -> Self {
        self.context_params.n_ubatch = n_ubatch;
        self
    }

    /// Get the `n_ubatch`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default();
    /// assert_eq!(params.n_ubatch(), 512);
    /// ```
    #[must_use]
    pub fn n_ubatch(&self) -> u32 {
        self.context_params.n_ubatch
    }

    /// Set the flash attention policy using llama.cpp enum
    #[must_use]
    pub fn with_flash_attention_policy(
        mut self,
        policy: llama_cpp_sys_2::llama_flash_attn_type,
    ) -> Self {
        self.context_params.flash_attn_type = policy;
        self
    }

    /// Get the flash attention policy
    #[must_use]
    pub fn flash_attention_policy(&self) -> llama_cpp_sys_2::llama_flash_attn_type {
        self.context_params.flash_attn_type
    }

    /// Set the `offload_kqv` parameter to control offloading KV cache & KQV ops to GPU
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///     .with_offload_kqv(false);
    /// assert_eq!(params.offload_kqv(), false);
    /// ```
    #[must_use]
    pub fn with_offload_kqv(mut self, enabled: bool) -> Self {
        self.context_params.offload_kqv = enabled;
        self
    }

    /// Get the `offload_kqv` parameter
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default();
    /// assert_eq!(params.offload_kqv(), true);
    /// ```
    #[must_use]
    pub fn offload_kqv(&self) -> bool {
        self.context_params.offload_kqv
    }

    /// Set the type of rope scaling.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::{LlamaContextParams, RopeScalingType};
    /// let params = LlamaContextParams::default()
    ///     .with_rope_scaling_type(RopeScalingType::Linear);
    /// assert_eq!(params.rope_scaling_type(), RopeScalingType::Linear);
    /// ```
    #[must_use]
    pub fn with_rope_scaling_type(mut self, rope_scaling_type: RopeScalingType) -> Self {
        self.context_params.rope_scaling_type = i32::from(rope_scaling_type);
        self
    }

    /// Get the type of rope scaling.
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert_eq!(params.rope_scaling_type(), llama_cpp_2::context::params::RopeScalingType::Unspecified);
    /// ```
    #[must_use]
    pub fn rope_scaling_type(&self) -> RopeScalingType {
        RopeScalingType::from(self.context_params.rope_scaling_type)
    }

    /// Set the rope frequency base.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///    .with_rope_freq_base(0.5);
    /// assert_eq!(params.rope_freq_base(), 0.5);
    /// ```
    #[must_use]
    pub fn with_rope_freq_base(mut self, rope_freq_base: f32) -> Self {
        self.context_params.rope_freq_base = rope_freq_base;
        self
    }

    /// Get the rope frequency base.
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert_eq!(params.rope_freq_base(), 0.0);
    /// ```
    #[must_use]
    pub fn rope_freq_base(&self) -> f32 {
        self.context_params.rope_freq_base
    }

    /// Set the rope frequency scale.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///   .with_rope_freq_scale(0.5);
    /// assert_eq!(params.rope_freq_scale(), 0.5);
    /// ```
    #[must_use]
    pub fn with_rope_freq_scale(mut self, rope_freq_scale: f32) -> Self {
        self.context_params.rope_freq_scale = rope_freq_scale;
        self
    }

    /// Get the rope frequency scale.
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert_eq!(params.rope_freq_scale(), 0.0);
    /// ```
    #[must_use]
    pub fn rope_freq_scale(&self) -> f32 {
        self.context_params.rope_freq_scale
    }

    /// Get the number of threads.
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert_eq!(params.n_threads(), 4);
    /// ```
    #[must_use]
    pub fn n_threads(&self) -> i32 {
        self.context_params.n_threads
    }

    /// Get the number of threads allocated for batches.
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert_eq!(params.n_threads_batch(), 4);
    /// ```
    #[must_use]
    pub fn n_threads_batch(&self) -> i32 {
        self.context_params.n_threads_batch
    }

    /// Set the number of threads.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///    .with_n_threads(8);
    /// assert_eq!(params.n_threads(), 8);
    /// ```
    #[must_use]
    pub fn with_n_threads(mut self, n_threads: i32) -> Self {
        self.context_params.n_threads = n_threads;
        self
    }

    /// Set the number of threads allocated for batches.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///    .with_n_threads_batch(8);
    /// assert_eq!(params.n_threads_batch(), 8);
    /// ```
    #[must_use]
    pub fn with_n_threads_batch(mut self, n_threads: i32) -> Self {
        self.context_params.n_threads_batch = n_threads;
        self
    }

    /// Check whether embeddings are enabled
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert!(!params.embeddings());
    /// ```
    #[must_use]
    pub fn embeddings(&self) -> bool {
        self.context_params.embeddings
    }

    /// Enable the use of embeddings
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///    .with_embeddings(true);
    /// assert!(params.embeddings());
    /// ```
    #[must_use]
    pub fn with_embeddings(mut self, embedding: bool) -> Self {
        self.context_params.embeddings = embedding;
        self
    }

    /// Set the evaluation callback.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// extern "C" fn cb_eval_fn(
    ///     t: *mut llama_cpp_sys_2::ggml_tensor,
    ///     ask: bool,
    ///     user_data: *mut std::ffi::c_void,
    /// ) -> bool {
    ///     false
    /// }
    ///
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default().with_cb_eval(Some(cb_eval_fn));
    /// ```
    #[must_use]
    pub fn with_cb_eval(
        mut self,
        cb_eval: llama_cpp_sys_2::ggml_backend_sched_eval_callback,
    ) -> Self {
        self.context_params.cb_eval = cb_eval;
        self
    }

    /// Set the evaluation callback user data.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default();
    /// let user_data = std::ptr::null_mut();
    /// let params = params.with_cb_eval_user_data(user_data);
    /// ```
    #[must_use]
    pub fn with_cb_eval_user_data(mut self, cb_eval_user_data: *mut std::ffi::c_void) -> Self {
        self.context_params.cb_eval_user_data = cb_eval_user_data;
        self
    }

    /// Set the type of pooling.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::{LlamaContextParams, LlamaPoolingType};
    /// let params = LlamaContextParams::default()
    ///     .with_pooling_type(LlamaPoolingType::Last);
    /// assert_eq!(params.pooling_type(), LlamaPoolingType::Last);
    /// ```
    #[must_use]
    pub fn with_pooling_type(mut self, pooling_type: LlamaPoolingType) -> Self {
        self.context_params.pooling_type = i32::from(pooling_type);
        self
    }

    /// Get the type of pooling.
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// assert_eq!(params.pooling_type(), llama_cpp_2::context::params::LlamaPoolingType::Unspecified);
    /// ```
    #[must_use]
    pub fn pooling_type(&self) -> LlamaPoolingType {
        LlamaPoolingType::from(self.context_params.pooling_type)
    }

    /// Set whether to use full sliding window attention
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///     .with_swa_full(false);
    /// assert_eq!(params.swa_full(), false);
    /// ```
    #[must_use]
    pub fn with_swa_full(mut self, enabled: bool) -> Self {
        self.context_params.swa_full = enabled;
        self
    }

    /// Get whether full sliding window attention is enabled
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default();
    /// assert_eq!(params.swa_full(), true);
    /// ```
    #[must_use]
    pub fn swa_full(&self) -> bool {
        self.context_params.swa_full
    }

    /// Set the max number of sequences (i.e. distinct states for recurrent models)
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default()
    ///     .with_n_seq_max(64);
    /// assert_eq!(params.n_seq_max(), 64);
    /// ```
    #[must_use]
    pub fn with_n_seq_max(mut self, n_seq_max: u32) -> Self {
        self.context_params.n_seq_max = n_seq_max;
        self
    }

    /// Get the max number of sequences (i.e. distinct states for recurrent models)
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::LlamaContextParams;
    /// let params = LlamaContextParams::default();
    /// assert_eq!(params.n_seq_max(), 1);
    /// ```
    #[must_use]
    pub fn n_seq_max(&self) -> u32 {
        self.context_params.n_seq_max
    }
    /// Set the KV cache data type for K
    /// use llama_cpp_2::context::params::{LlamaContextParams, KvCacheType};
    /// let params = LlamaContextParams::default().with_type_k(KvCacheType::Q4_0);
    /// assert_eq!(params.type_k(), KvCacheType::Q4_0);
    /// ```
    #[must_use]
    pub fn with_type_k(mut self, type_k: KvCacheType) -> Self {
        self.context_params.type_k = type_k.into();
        self
    }

    /// Get the KV cache data type for K
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// let _ = params.type_k();
    /// ```
    #[must_use]
    pub fn type_k(&self) -> KvCacheType {
        KvCacheType::from(self.context_params.type_k)
    }

    /// Set the KV cache data type for V
    ///
    /// # Examples
    ///
    /// ```rust
    /// use llama_cpp_2::context::params::{LlamaContextParams, KvCacheType};
    /// let params = LlamaContextParams::default().with_type_v(KvCacheType::Q4_1);
    /// assert_eq!(params.type_v(), KvCacheType::Q4_1);
    /// ```
    #[must_use]
    pub fn with_type_v(mut self, type_v: KvCacheType) -> Self {
        self.context_params.type_v = type_v.into();
        self
    }

    /// Get the KV cache data type for V
    ///
    /// # Examples
    ///
    /// ```rust
    /// let params = llama_cpp_2::context::params::LlamaContextParams::default();
    /// let _ = params.type_v();
    /// ```
    #[must_use]
    pub fn type_v(&self) -> KvCacheType {
        KvCacheType::from(self.context_params.type_v)
    }
}

/// Default parameters for `LlamaContext`. (as defined in llama.cpp by `llama_context_default_params`)
/// ```
/// # use std::num::NonZeroU32;
/// use llama_cpp_2::context::params::{LlamaContextParams, RopeScalingType};
/// let params = LlamaContextParams::default();
/// assert_eq!(params.n_ctx(), NonZeroU32::new(512), "n_ctx should be 512");
/// assert_eq!(params.rope_scaling_type(), RopeScalingType::Unspecified);
/// ```
impl Default for LlamaContextParams {
    fn default() -> Self {
        let context_params = unsafe { llama_cpp_sys_2::llama_context_default_params() };
        Self { context_params }
    }
}
