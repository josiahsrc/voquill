# rust_transcription

Rust sidecar service for local Whisper transcription in Voquill.

It exposes one REST interface for both CPU and GPU binaries:

- `POST /v1/models/{model}/download`
- `GET /v1/models/{model}/download/{jobId}`
- `DELETE /v1/models/{model}`
- `GET /v1/models/{model}/status`
- `GET /v1/devices`
- `POST /v1/transcriptions`
- `POST /v1/transcriptions/sessions`
- `POST /v1/transcriptions/sessions/{sessionId}/chunks`
- `POST /v1/transcriptions/sessions/{sessionId}/finalize`
- `DELETE /v1/transcriptions/sessions/{sessionId}`

Supported models: `tiny`, `base`, `small`, `medium`, `large`, `turbo`.

## Build

From repository root:

```bash
cargo build --manifest-path packages/rust_transcription/Cargo.toml --release --bin rust-transcription-cpu
cargo build --manifest-path packages/rust_transcription/Cargo.toml --release --bin rust-transcription-gpu --features gpu,gpu-metal   # macOS
cargo build --manifest-path packages/rust_transcription/Cargo.toml --release --bin rust-transcription-gpu --features gpu,gpu-vulkan  # Linux/Windows
```

## Run

CPU sidecar:

```bash
cargo run --manifest-path packages/rust_transcription/Cargo.toml --bin rust-transcription-cpu
```

GPU sidecar:

```bash
cargo run --manifest-path packages/rust_transcription/Cargo.toml --bin rust-transcription-gpu --features gpu,gpu-metal   # macOS
cargo run --manifest-path packages/rust_transcription/Cargo.toml --bin rust-transcription-gpu --features gpu,gpu-vulkan  # Linux/Windows
```

If GPU runtime is not available, the GPU binary exits with a non-zero code.

## Environment

- `RUST_TRANSCRIPTION_HOST` (default `127.0.0.1`)
- `RUST_TRANSCRIPTION_PORT` (default CPU `7771`, GPU `7772`)
- `RUST_TRANSCRIPTION_MODELS_DIR` (default `./models`)
- `RUST_TRANSCRIPTION_MODEL_URL_TINY`
- `RUST_TRANSCRIPTION_MODEL_URL_BASE`
- `RUST_TRANSCRIPTION_MODEL_URL_SMALL`
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

### `DELETE /v1/models/{model}`

Deletes a downloaded model file (and any partial download fragments) if no
active download is running for that model.

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

### `GET /v1/devices`

Returns available compute devices for the running sidecar mode.

- CPU sidecar: returns CPU devices (typically one device: `cpu:0`).
- GPU sidecar: returns available GPU backend devices (`gpu:{index}`), including Metal on macOS and Vulkan where available.

Response:

```json
{
  "devices": [
    {
      "id": "cpu:0",
      "name": "CPU"
    }
  ]
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
  "initialPrompt": "Glossary: Voquill",
  "deviceId": "cpu:0"
}
```

`deviceId` is optional. If omitted, the sidecar uses the first available device from `GET /v1/devices`.

Response:

```json
{
  "text": "transcribed text",
  "model": "tiny",
  "inferenceDevice": "CPU",
  "durationMs": 385
}
```

### `POST /v1/transcriptions/sessions`

Creates a buffered transcription session for chunked audio upload.

Request:

```json
{
  "model": "tiny",
  "sampleRate": 16000,
  "language": "en",
  "initialPrompt": "Glossary: Voquill",
  "deviceId": "cpu:0"
}
```

Response:

```json
{
  "sessionId": "uuid"
}
```

### `POST /v1/transcriptions/sessions/{sessionId}/chunks`

Uploads one audio chunk as raw little-endian `Float32` bytes (`Content-Type: application/octet-stream`).

Response:

```json
{
  "receivedSamples": 1600,
  "bufferedSamples": 6400
}
```

### `POST /v1/transcriptions/sessions/{sessionId}/finalize`

Finalizes and transcribes all buffered samples for the session.

Response shape matches `POST /v1/transcriptions`.

### `DELETE /v1/transcriptions/sessions/{sessionId}`

Deletes a buffered transcription session (idempotent cleanup).
