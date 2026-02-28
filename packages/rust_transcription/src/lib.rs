mod api;
mod compute;
mod config;
mod downloads;
mod errors;
mod models;
mod state;
mod transcription;

pub use compute::ComputeMode;
pub use models::WhisperModel;
pub use transcription::ensure_gpu_runtime_available;

use tokio::net::TcpListener;
use tracing::info;

use crate::config::SidecarConfig;
use crate::state::AppState;

pub async fn run_server(mode: ComputeMode) -> Result<(), String> {
    let config = SidecarConfig::from_env(mode)?;

    tokio::fs::create_dir_all(&config.models_dir)
        .await
        .map_err(|err| format!("failed to create models directory: {err}"))?;

    let address = config.bind_address();
    let state = AppState::new(config.clone())?;
    let router = api::create_router(state);

    let listener = TcpListener::bind(&address)
        .await
        .map_err(|err| format!("failed to bind to {address}: {err}"))?;

    info!(
        mode = config.mode.as_str(),
        host = %config.host,
        port = config.port,
        models_dir = %config.models_dir.display(),
        "rust_transcription sidecar started"
    );

    axum::serve(listener, router)
        .await
        .map_err(|err| format!("sidecar server failed: {err}"))
}
