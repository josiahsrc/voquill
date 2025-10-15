# whisper-rs

Rust bindings to [whisper.cpp](https://github.com/ggerganov/whisper.cpp/)

## Usage

```bash
git clone --recursive https://codeberg.org/tazz4843/whisper-rs.git

cd whisper-rs

cargo run --example basic_use

cargo run --example audio_transcription
```

```rust
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};

fn main() {
    let path_to_model = std::env::args().nth(1).unwrap();

    // load a context and model
    let ctx = WhisperContext::new_with_params(
        path_to_model,
        WhisperContextParameters::default()
    ).expect("failed to load model");

    // create a params object
    let params = FullParams::new(SamplingStrategy::BeamSearch {
        beam_size: 5,
        patience: -1.0,
    });

    // assume we have a buffer of audio data
    // here we'll make a fake one, floating point samples, 32 bit, 16KHz, mono
    let audio_data = vec![0_f32; 16000 * 2];

    // now we can run the model
    let mut state = ctx.create_state().expect("failed to create state");
    state
        .full(params, &audio_data[..])
        .expect("failed to run model");

    // fetch the results
    for segment in state.as_iter() {
        println!(
            "[{} - {}]: {}",
            // note start and end timestamps are in centiseconds
            // (10s of milliseconds)
            segment.start_timestamp(),
            segment.end_timestamp(),
            // the Display impl for WhisperSegment will replace invalid UTF-8 with the Unicode replacement character
            segment
        );
    }
}
```

See [examples/basic_use.rs](examples/basic_use.rs) for more details.

Lower level bindings are exposed if needed, but the above should be enough for most use cases.
See the docs: https://docs.rs/whisper-rs/ for more details.

## Feature flags

All disabled by default unless otherwise specified.

* `raw-api`: expose whisper-rs-sys without having to pull it in as a dependency.
  **NOTE**: enabling this no longer guarantees semver compliance,
  as whisper-rs-sys may be upgraded to a breaking version in a patch release of whisper-rs.
* `cuda`: enable CUDA support. Implicitly enables hidden GPU flag at runtime.
* `hipblas`: enable ROCm/hipBLAS support. Only available on linux. Implicitly enables hidden GPU flag at runtime.
* `openblas`: enable OpenBLAS support.
* `metal`: enable Metal support. Implicitly enables hidden GPU flag at runtime.
* `vulkan`: enable Vulkan support. Implicitly enables hidden GPU flag at runtime.
* `log_backend`: allows hooking into whisper.cpp's log output and sending it to the `log` backend. Requires calling
* `tracing_backend`: allows hooking into whisper.cpp's log output and sending it to the `tracing` backend.

## Building

See [BUILDING.md](BUILDING.md) for instructions for building whisper-rs on Windows and OSX M1. Linux builds should just
work out of the box.

## Troubleshooting

* Something other than Windows/macOS/Linux isn't working!
    * I don't have a way to test these platforms, so I can't really help you.
        * If you can get it working, please open a PR with any changes to make it work and build instructions in
          BUILDING.md!
* I get a panic during binding generation build!
    * You can attempt to fix it yourself, or you can set the `WHISPER_DONT_GENERATE_BINDINGS` environment variable.
      This skips attempting to build the bindings whatsoever and copies the existing ones. They may be out of date,
      but it's better than nothing.
        * `WHISPER_DONT_GENERATE_BINDINGS=1 cargo build`
    * If you can fix the issue, please open a PR!

## License

[Unlicense](LICENSE)

tl;dr: code is in the public domain

[the PR template](./.github/PULL_REQUEST_TEMPLATE.md) is derived from
[GoToSocial's PR template](https://codeberg.org/superseriousbusiness/gotosocial/src/branch/main/.gitea/pull_request_template.md)
