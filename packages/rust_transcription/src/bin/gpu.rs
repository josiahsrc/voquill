use rust_transcription::{ensure_gpu_runtime_available, run_server, ComputeMode};

#[tokio::main]
async fn main() {
    init_tracing();

    if let Err(err) = ensure_gpu_runtime_available() {
        eprintln!("[rust-transcription-gpu] {err}");
        std::process::exit(1);
    }

    if let Err(err) = run_server(ComputeMode::Gpu).await {
        eprintln!("[rust-transcription-gpu] {err}");
        std::process::exit(1);
    }
}

fn init_tracing() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .try_init();
}
