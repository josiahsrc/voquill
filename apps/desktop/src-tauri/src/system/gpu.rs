use serde::{Deserialize, Serialize};
use std::io::Read;
use std::panic;
use std::process::{Command, Stdio};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
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

/// Directly enumerate GPUs in the current process (potentially unsafe)
fn enumerate_gpus_directly() -> Vec<GpuAdapterInfo> {
    eprintln!("[gpu] Enumerating GPUs directly...");

    // Wrap the entire GPU enumeration in catch_unwind to handle driver crashes
    let result = panic::catch_unwind(panic::AssertUnwindSafe(|| {
        let mut descriptor = wgpu::InstanceDescriptor::default();
        descriptor.backends = wgpu::Backends::all();
        let instance = wgpu::Instance::new(descriptor);

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
    }));

    match result {
        Ok(adapters) => {
            eprintln!("[gpu] Successfully enumerated {} GPU(s)", adapters.len());
            adapters
        }
        Err(panic_info) => {
            eprintln!("[gpu] ERROR: GPU enumeration panicked!");
            if let Some(s) = panic_info.downcast_ref::<&str>() {
                eprintln!("[gpu] Panic message: {s}");
            } else if let Some(s) = panic_info.downcast_ref::<String>() {
                eprintln!("[gpu] Panic message: {s}");
            } else {
                eprintln!("[gpu] Panic message: <unknown>");
            }
            eprintln!(
                "[gpu] This is likely caused by GPU driver issues (particularly AMD on Windows)."
            );
            eprintln!("[gpu] Returning empty GPU list.");
            Vec::new()
        }
    }
}

/// Enumerate GPUs in a separate child process to protect against crashes
fn enumerate_gpus_in_child_process() -> Vec<GpuAdapterInfo> {
    eprintln!("[gpu] Enumerating GPUs in child process...");

    let exe = match std::env::current_exe() {
        Ok(path) => path,
        Err(err) => {
            eprintln!("[gpu] ERROR: Failed to get current exe path: {err}");
            return Vec::new();
        }
    };

    let mut command = Command::new(exe);
    command
        .env("VOQUILL_GPU_ENUMERATOR", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(err) => {
            eprintln!("[gpu] ERROR: Failed to spawn GPU enumerator process: {err}");
            return Vec::new();
        }
    };

    // Set a timeout for the child process
    let _timeout = Duration::from_secs(10);
    let _start = std::time::Instant::now();

    // Read stdout completely
    let mut stdout = match child.stdout.take() {
        Some(stdout) => stdout,
        None => {
            eprintln!("[gpu] ERROR: Failed to capture child stdout");
            let _ = child.kill();
            return Vec::new();
        }
    };

    // Read all output
    let mut output = String::new();
    if let Err(err) = stdout.read_to_string(&mut output) {
        eprintln!("[gpu] ERROR: Failed to read from child stdout: {err}");
        let _ = child.kill();
        return Vec::new();
    }

    // Wait for child to exit
    match child.wait() {
        Ok(status) => {
            if !status.success() {
                eprintln!(
                    "[gpu] WARNING: GPU enumerator process exited with status: {}",
                    status
                );
                return Vec::new();
            }
        }
        Err(err) => {
            eprintln!("[gpu] ERROR: Failed to wait for child process: {err}");
            return Vec::new();
        }
    }

    // Parse JSON output
    match serde_json::from_str::<Vec<GpuAdapterInfo>>(output.trim()) {
        Ok(gpus) => {
            eprintln!(
                "[gpu] Successfully enumerated {} GPU(s) via child process",
                gpus.len()
            );
            gpus
        }
        Err(err) => {
            eprintln!("[gpu] ERROR: Failed to parse GPU enumeration output: {err}");
            eprintln!("[gpu] Output was: {}", output.trim());
            Vec::new()
        }
    }
}

/// List available GPUs - uses child process for safety on all platforms
pub fn list_available_gpus() -> Vec<GpuAdapterInfo> {
    enumerate_gpus_in_child_process()
}

/// Entry point for the GPU enumerator child process
/// This function is called when VOQUILL_GPU_ENUMERATOR=1
pub fn run_gpu_enumerator_process() -> Result<(), String> {
    eprintln!("[gpu-enumerator] Starting GPU enumeration in child process");

    let gpus = enumerate_gpus_directly();

    // Output JSON to stdout
    let json = serde_json::to_string(&gpus)
        .map_err(|err| format!("Failed to serialize GPU list: {err}"))?;

    println!("{}", json);

    eprintln!("[gpu-enumerator] GPU enumeration complete");
    Ok(())
}
