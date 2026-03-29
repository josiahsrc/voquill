use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
};

unsafe fn get_endpoint_volume() -> Result<IAudioEndpointVolume, windows::core::Error> {
    let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    let enumerator: IMMDeviceEnumerator =
        CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
    let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;
    device.Activate(CLSCTX_ALL, None)
}

pub fn get_system_volume() -> Result<f64, String> {
    unsafe {
        let endpoint = get_endpoint_volume().map_err(|e| e.to_string())?;
        let level = endpoint
            .GetMasterVolumeLevelScalar()
            .map_err(|e| e.to_string())?;
        Ok(level as f64)
    }
}

pub fn set_system_volume(volume: f64) -> Result<(), String> {
    unsafe {
        let endpoint = get_endpoint_volume().map_err(|e| e.to_string())?;
        endpoint
            .SetMasterVolumeLevelScalar(volume as f32, None)
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
