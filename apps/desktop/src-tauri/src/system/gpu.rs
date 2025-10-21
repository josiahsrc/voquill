use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuAdapterInfo {
    pub name: String,
    pub vendor: u32,
    pub device: u32,
    pub device_type: String,
    pub backend: String,
}

pub fn list_available_gpus() -> Vec<GpuAdapterInfo> {
    let mut descriptor = wgpu::InstanceDescriptor::default();
    descriptor.backends = wgpu::Backends::all();

    let instance = wgpu::Instance::new(descriptor);

    instance
        .enumerate_adapters(wgpu::Backends::all())
        .into_iter()
        .map(|adapter| {
            let info = adapter.get_info();
            GpuAdapterInfo {
                name: info.name,
                vendor: info.vendor,
                device: info.device,
                device_type: format!("{:?}", info.device_type),
                backend: format!("{:?}", info.backend),
            }
        })
        .collect()
}
