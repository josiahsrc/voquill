# rust_transcription

Rust sidecar service for local Whisper transcription in Voquill.

It exposes one REST interface for both CPU and GPU binaries:

- `POST /v1/models/{model}/download`
- `GET /v1/models/{model}/download/{jobId}`
- `GET /v1/models/{model}/status`
- `POST /v1/transcriptions`

Supported models: `tiny`, `medium`, `large`, `turbo`.

## Build

From repository root:

```bash
cargo build --manifest-path packages/rust_transcription/Cargo.toml --release --bin rust-transcription-cpu
cargo build --manifest-path packages/rust_transcription/Cargo.toml --release --bin rust-transcription-gpu --features gpu
```

## Run

CPU sidecar:

```bash
cargo run --manifest-path packages/rust_transcription/Cargo.toml --bin rust-transcription-cpu
```

GPU sidecar:

```bash
cargo run --manifest-path packages/rust_transcription/Cargo.toml --bin rust-transcription-gpu --features gpu
```

If GPU runtime is not available, the GPU binary exits with a non-zero code.

## Environment

- `RUST_TRANSCRIPTION_HOST` (default `127.0.0.1`)
- `RUST_TRANSCRIPTION_PORT` (default CPU `7771`, GPU `7772`)
- `RUST_TRANSCRIPTION_MODELS_DIR` (default `./models`)
- `RUST_TRANSCRIPTION_MODEL_URL_TINY`
- `RUST_TRANSCRIPTION_MODEL_URL_MEDIUM`
- `RUST_TRANSCRIPTION_MODEL_URL_LARGE`
- `RUST_TRANSCRIPTION_MODEL_URL_TURBO`

## API

### `POST /v1/models/{model}/download`

Starts model download, or returns the active job for that model.

Response:

```json
{
  "jobId": "uuid",
  "model": "tiny",
  "status": "pending",
  "bytesDownloaded": 0,
  "totalBytes": null,
  "progress": null,
  "error": null
}
```

## Integration Tests

Fast binary-level integration test:

```bash
cargo test --manifest-path packages/rust_transcription/Cargo.toml --test sidecar_integration
```

Full end-to-end test (downloads tiny model and transcribes `packages/rust_transcription/assets/test.wav`):

```bash
cargo test --manifest-path packages/rust_transcription/Cargo.toml --test sidecar_integration -- --ignored
```

### `GET /v1/models/{model}/download/{jobId}`

Returns download progress.

### `GET /v1/models/{model}/status?validate=true`

Returns whether model file exists and whether Whisper can load it.

Response:

```json
{
  "model": "tiny",
  "downloaded": true,
  "valid": true,
  "fileBytes": 78000000,
  "validationError": null
}
```

### `POST /v1/transcriptions`

Request:

```json
{
  "model": "tiny",
  "samples": [0.01, -0.02],
  "sampleRate": 16000,
  "language": "en",
  "initialPrompt": "Glossary: Voquill"
}
```

Response:

```json
{
  "text": "transcribed text",
  "model": "tiny",
  "inferenceDevice": "CPU",
  "durationMs": 385
}
```
