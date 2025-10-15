use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};

#[derive(Clone)]
pub struct OptionKeyCounter {
    inner: Arc<AtomicU64>,
}

impl OptionKeyCounter {
    pub fn new(initial: u64) -> Self {
        Self {
            inner: Arc::new(AtomicU64::new(initial)),
        }
    }

    pub fn clone_inner(&self) -> Arc<AtomicU64> {
        Arc::clone(&self.inner)
    }

    pub fn load(&self) -> u64 {
        self.inner.load(Ordering::SeqCst)
    }

    pub fn store(&self, value: u64) {
        self.inner.store(value, Ordering::SeqCst);
    }
}
