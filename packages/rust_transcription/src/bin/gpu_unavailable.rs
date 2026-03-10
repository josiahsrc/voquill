fn main() {
    eprintln!(
        "[rust-transcription-gpu] native GPU sidecar is unavailable in this build. \
Build the GPU binary with a real backend enabled (Metal on macOS, Vulkan on Windows/Linux)."
    );
    std::process::exit(1);
}
