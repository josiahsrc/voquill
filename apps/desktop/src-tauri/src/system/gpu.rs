use serde::Serialize;
use std::panic;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuAdapterInfo {
    pub name: String,
    pub vendor: u32,
    pub device: u32,
    pub device_type: String,
    pub backend: String,
}

/// Get vendor name from vendor ID
fn get_vendor_name(vendor_id: u32) -> &'static str {
    match vendor_id {
        0x1002 => "AMD",
        0x8086 => "Intel",
        0x10DE => "NVIDIA",
        0x1414 => "Microsoft",
        0x5143 => "Qualcomm",
        0x13B5 => "ARM",
        _ => "Unknown",
    }
}

pub fn list_available_gpus() -> Vec<GpuAdapterInfo> {
    eprintln!("[gpu] Enumerating GPUs...");

    let instance_result = panic::catch_unwind(|| {
        let mut descriptor = wgpu::InstanceDescriptor::default();
        descriptor.backends = wgpu::Backends::all();
        wgpu::Instance::new(descriptor)
    });

    let instance = match instance_result {
        Ok(inst) => inst,
        Err(panic_info) => {
            eprintln!("[gpu] ERROR: wgpu::Instance::new() panicked!");
            if let Some(s) = panic_info.downcast_ref::<&str>() {
                eprintln!("[gpu] Panic message: {s}");
            } else if let Some(s) = panic_info.downcast_ref::<String>() {
                eprintln!("[gpu] Panic message: {s}");
            } else {
                eprintln!("[gpu] Panic message: <unknown>");
            }
            eprintln!("[gpu] This is likely caused by GPU driver issues.");
            eprintln!("[gpu] Returning empty GPU list.");
            return Vec::new();
        }
    };

    let adapters_result = panic::catch_unwind(|| {
        instance
            .enumerate_adapters(wgpu::Backends::all())
            .into_iter()
            .map(|adapter| {
                let info = adapter.get_info();

                let vendor_name = get_vendor_name(info.vendor);
                eprintln!(
                    "[gpu] Found: {} (Vendor: {} [0x{:04X}], Device: 0x{:04X}, Type: {:?}, Backend: {:?})",
                    info.name, vendor_name, info.vendor, info.device, info.device_type, info.backend
                );

                GpuAdapterInfo {
                    name: info.name,
                    vendor: info.vendor,
                    device: info.device,
                    device_type: format!("{:?}", info.device_type),
                    backend: format!("{:?}", info.backend),
                }
            })
            .collect::<Vec<_>>()
    });

    match adapters_result {
        Ok(adapters) => {
            eprintln!("[gpu] Successfully enumerated {} GPU(s)", adapters.len());
            adapters
        }
        Err(panic_info) => {
            eprintln!("[gpu] ERROR: enumerate_adapters() panicked!");
            if let Some(s) = panic_info.downcast_ref::<&str>() {
                eprintln!("[gpu] Panic message: {s}");
            } else if let Some(s) = panic_info.downcast_ref::<String>() {
                eprintln!("[gpu] Panic message: {s}");
            } else {
                eprintln!("[gpu] Panic message: <unknown>");
            }
            eprintln!("[gpu] This is likely caused by GPU driver issues (particularly AMD on Windows).");
            eprintln!("[gpu] Returning empty GPU list.");
            Vec::new()
        }
    }
}
