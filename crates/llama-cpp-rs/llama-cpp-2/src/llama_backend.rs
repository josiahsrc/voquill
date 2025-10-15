//! Representation of an initialized llama backend

use crate::LLamaCppError;
use llama_cpp_sys_2::ggml_log_level;
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering::SeqCst;

/// Representation of an initialized llama backend
/// This is required as a parameter for most llama functions as the backend must be initialized
/// before any llama functions are called. This type is proof of initialization.
#[derive(Eq, PartialEq, Debug)]
pub struct LlamaBackend {}

static LLAMA_BACKEND_INITIALIZED: AtomicBool = AtomicBool::new(false);

impl LlamaBackend {
    /// Mark the llama backend as initialized
    fn mark_init() -> crate::Result<()> {
        match LLAMA_BACKEND_INITIALIZED.compare_exchange(false, true, SeqCst, SeqCst) {
            Ok(_) => Ok(()),
            Err(_) => Err(LLamaCppError::BackendAlreadyInitialized),
        }
    }

    /// Initialize the llama backend (without numa).
    ///
    /// # Examples
    ///
    /// ```
    ///# use llama_cpp_2::llama_backend::LlamaBackend;
    ///# use llama_cpp_2::LLamaCppError;
    ///# use std::error::Error;
    ///
    ///# fn main() -> Result<(), Box<dyn Error>> {
    ///
    ///
    /// let backend = LlamaBackend::init()?;
    /// // the llama backend can only be initialized once
    /// assert_eq!(Err(LLamaCppError::BackendAlreadyInitialized), LlamaBackend::init());
    ///
    ///# Ok(())
    ///# }
    /// ```
    #[tracing::instrument(skip_all)]
    pub fn init() -> crate::Result<LlamaBackend> {
        Self::mark_init()?;
        unsafe { llama_cpp_sys_2::llama_backend_init() }
        Ok(LlamaBackend {})
    }

    /// Initialize the llama backend (with numa).
    /// ```
    ///# use llama_cpp_2::llama_backend::LlamaBackend;
    ///# use std::error::Error;
    ///# use llama_cpp_2::llama_backend::NumaStrategy;
    ///
    ///# fn main() -> Result<(), Box<dyn Error>> {
    ///
    /// let llama_backend = LlamaBackend::init_numa(NumaStrategy::MIRROR)?;
    ///
    ///# Ok(())
    ///# }
    /// ```
    #[tracing::instrument(skip_all)]
    pub fn init_numa(strategy: NumaStrategy) -> crate::Result<LlamaBackend> {
        Self::mark_init()?;
        unsafe {
            llama_cpp_sys_2::llama_numa_init(llama_cpp_sys_2::ggml_numa_strategy::from(strategy));
        }
        Ok(LlamaBackend {})
    }

    /// Was the code built for a GPU backend & is a supported one available.
    pub fn supports_gpu_offload(&self) -> bool {
        unsafe { llama_cpp_sys_2::llama_supports_gpu_offload() }
    }

    /// Does this platform support loading the model via mmap.
    pub fn supports_mmap(&self) -> bool {
        unsafe { llama_cpp_sys_2::llama_supports_mmap() }
    }

    /// Does this platform support locking the model in RAM.
    pub fn supports_mlock(&self) -> bool {
        unsafe { llama_cpp_sys_2::llama_supports_mlock() }
    }

    /// Change the output of llama.cpp's logging to be voided instead of pushed to `stderr`.
    pub fn void_logs(&mut self) {
        unsafe extern "C" fn void_log(
            _level: ggml_log_level,
            _text: *const ::std::os::raw::c_char,
            _user_data: *mut ::std::os::raw::c_void,
        ) {
        }

        unsafe {
            llama_cpp_sys_2::llama_log_set(Some(void_log), std::ptr::null_mut());
        }
    }
}

/// A rusty wrapper around `numa_strategy`.
#[derive(Debug, Eq, PartialEq, Copy, Clone)]
pub enum NumaStrategy {
    /// The numa strategy is disabled.
    DISABLED,
    /// help wanted: what does this do?
    DISTRIBUTE,
    /// help wanted: what does this do?
    ISOLATE,
    /// help wanted: what does this do?
    NUMACTL,
    /// help wanted: what does this do?
    MIRROR,
    /// help wanted: what does this do?
    COUNT,
}

/// An invalid numa strategy was provided.
#[derive(Debug, Eq, PartialEq, Copy, Clone)]
pub struct InvalidNumaStrategy(
    /// The invalid numa strategy that was provided.
    pub llama_cpp_sys_2::ggml_numa_strategy,
);

impl TryFrom<llama_cpp_sys_2::ggml_numa_strategy> for NumaStrategy {
    type Error = InvalidNumaStrategy;

    fn try_from(value: llama_cpp_sys_2::ggml_numa_strategy) -> Result<Self, Self::Error> {
        match value {
            llama_cpp_sys_2::GGML_NUMA_STRATEGY_DISABLED => Ok(Self::DISABLED),
            llama_cpp_sys_2::GGML_NUMA_STRATEGY_DISTRIBUTE => Ok(Self::DISTRIBUTE),
            llama_cpp_sys_2::GGML_NUMA_STRATEGY_ISOLATE => Ok(Self::ISOLATE),
            llama_cpp_sys_2::GGML_NUMA_STRATEGY_NUMACTL => Ok(Self::NUMACTL),
            llama_cpp_sys_2::GGML_NUMA_STRATEGY_MIRROR => Ok(Self::MIRROR),
            llama_cpp_sys_2::GGML_NUMA_STRATEGY_COUNT => Ok(Self::COUNT),
            value => Err(InvalidNumaStrategy(value)),
        }
    }
}

impl From<NumaStrategy> for llama_cpp_sys_2::ggml_numa_strategy {
    fn from(value: NumaStrategy) -> Self {
        match value {
            NumaStrategy::DISABLED => llama_cpp_sys_2::GGML_NUMA_STRATEGY_DISABLED,
            NumaStrategy::DISTRIBUTE => llama_cpp_sys_2::GGML_NUMA_STRATEGY_DISTRIBUTE,
            NumaStrategy::ISOLATE => llama_cpp_sys_2::GGML_NUMA_STRATEGY_ISOLATE,
            NumaStrategy::NUMACTL => llama_cpp_sys_2::GGML_NUMA_STRATEGY_NUMACTL,
            NumaStrategy::MIRROR => llama_cpp_sys_2::GGML_NUMA_STRATEGY_MIRROR,
            NumaStrategy::COUNT => llama_cpp_sys_2::GGML_NUMA_STRATEGY_COUNT,
        }
    }
}

/// Drops the llama backend.
/// ```
///
///# use llama_cpp_2::llama_backend::LlamaBackend;
///# use std::error::Error;
///
///# fn main() -> Result<(), Box<dyn Error>> {
/// let backend = LlamaBackend::init()?;
/// drop(backend);
/// // can be initialized again after being dropped
/// let backend = LlamaBackend::init()?;
///# Ok(())
///# }
///
/// ```
impl Drop for LlamaBackend {
    fn drop(&mut self) {
        match LLAMA_BACKEND_INITIALIZED.compare_exchange(true, false, SeqCst, SeqCst) {
            Ok(_) => {}
            Err(_) => {
                unreachable!("This should not be reachable as the only ways to obtain a llama backend involve marking the backend as initialized.")
            }
        }
        unsafe { llama_cpp_sys_2::llama_backend_free() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numa_from_and_to() {
        let numas = [
            NumaStrategy::DISABLED,
            NumaStrategy::DISTRIBUTE,
            NumaStrategy::ISOLATE,
            NumaStrategy::NUMACTL,
            NumaStrategy::MIRROR,
            NumaStrategy::COUNT,
        ];

        for numa in &numas {
            let from = llama_cpp_sys_2::ggml_numa_strategy::from(*numa);
            let to = NumaStrategy::try_from(from).expect("Failed to convert from and to");
            assert_eq!(*numa, to);
        }
    }

    #[test]
    fn check_invalid_numa() {
        let invalid = 800;
        let invalid = NumaStrategy::try_from(invalid);
        assert_eq!(invalid, Err(InvalidNumaStrategy(invalid.unwrap_err().0)));
    }
}
