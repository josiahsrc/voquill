use std::{ffi::CStr, os::raw::c_int};
use whisper_rs_sys::{
    ggml_backend_buffer_type_t, ggml_backend_vk_buffer_type, ggml_backend_vk_get_device_count,
    ggml_backend_vk_get_device_description, ggml_backend_vk_get_device_memory,
};

#[derive(Debug, Clone)]
pub struct VKVram {
    pub free: usize,
    pub total: usize,
}

/// Human-readable device information
#[derive(Debug, Clone)]
pub struct VkDeviceInfo {
    pub id: i32,
    pub name: String,
    pub vram: VKVram,
    /// Buffer type to pass to `whisper::Backend::create_buffer`
    pub buf_type: ggml_backend_buffer_type_t,
}
/// Enumerate every physical GPU ggml can see.
///
/// Note: integrated GPUs are returned *after* discrete ones,
/// mirroring ggml’s C logic.
pub fn list_devices() -> Vec<VkDeviceInfo> {
    unsafe {
        let n = ggml_backend_vk_get_device_count();
        (0..n)
            .map(|id| {
                // 256 bytes is plenty (spec says 128 is enough)
                let mut tmp: [libc::c_char; 256] = [0; 256];
                ggml_backend_vk_get_device_description(id as c_int, tmp.as_mut_ptr(), tmp.len());
                let mut free = 0usize;
                let mut total = 0usize;
                ggml_backend_vk_get_device_memory(id, &mut free, &mut total);
                VkDeviceInfo {
                    id,
                    name: CStr::from_ptr(tmp.as_ptr()).to_string_lossy().into_owned(),
                    vram: VKVram { free, total },
                    buf_type: ggml_backend_vk_buffer_type(id as usize),
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod vulkan_tests {
    use super::*;

    #[test]
    fn enumerate_must_not_panic() {
        let _ = list_devices();
    }

    #[test]
    fn sane_device_info() {
        let gpus = list_devices();
        let mut seen = std::collections::HashSet::new();

        for dev in &gpus {
            assert!(seen.insert(dev.id), "duplicated id {}", dev.id);
            assert!(!dev.name.trim().is_empty(), "GPU {} has empty name", dev.id);
            assert!(
                dev.vram.total >= dev.vram.free,
                "GPU {} total < free",
                dev.id
            );
        }
    }
}
