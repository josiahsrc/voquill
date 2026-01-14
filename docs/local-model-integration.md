# Local Model Integration Guide

This guide explains how to add a new locally-run model to the Voquill desktop app. It covers the complete flow from UI settings to Rust inference, and explains how to adapt the patterns for different model types.

## Overview

The model integration stack consists of several layers:

```
Settings UI (React)
       ↓
State Management (Zustand)
       ↓
Repository Layer (TypeScript)
       ↓
Tauri Commands (Rust)          ─or─    External Service (Ollama, etc.)
       ↓
Platform Layer (whisper.rs, models.rs)
```

## Model Integration Patterns

The codebase supports three patterns for local model integration:

### Pattern 1: Embedded Model (Whisper)

Model runs directly in the Rust process via native libraries.

```
TypeScript → Tauri Command → Rust Library (whisper-rs) → GPU/CPU
```

**Pros:** No external dependencies, single binary distribution
**Cons:** Complex Rust integration, model bundled with app
**Use for:** Core functionality that must work offline

### Pattern 2: External Service (Ollama)

Model runs in a separate process/container, accessed via HTTP.

```
TypeScript → HTTP Client → Ollama API → Local LLM
```

**Pros:** Easy to add new models, user manages their own models
**Cons:** Requires user setup, not bundled with app
**Use for:** Optional features, user-provided models

### Pattern 3: Hybrid (Future)

Model inference in child process for crash isolation.

```
TypeScript → Tauri Command → Child Process → Model Inference
```

**Pros:** Crash isolation, memory separation
**Cons:** IPC overhead, more complex
**Use for:** Large/unstable models that might crash

## Adapting for Different Model Types

### Speech-to-Text (Current: Whisper)

**Input:** Audio samples (Float32Array) + sample rate
**Output:** Transcript text
**Key considerations:**
- Audio segmentation for long recordings
- GPU acceleration for speed
- Language detection/selection

### Text Generation (Current: Ollama/API)

**Input:** System prompt + user prompt
**Output:** Generated text
**Key considerations:**
- Streaming responses for long outputs
- Context window limits
- JSON mode for structured output

### Adding a New Model Type

To add a completely different model type (e.g., image generation, embedding):

1. **Define the repository interface** in `src/repos/`:
```typescript
// src/repos/image-generation.repo.ts
export type GenerateImageInput = {
  prompt: string;
  width: number;
  height: number;
};

export type GenerateImageOutput = {
  imageBase64: string;
  metadata?: { model: string; device: string };
};

export abstract class BaseGenerateImageRepo extends BaseRepo {
  abstract generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>;
}
```

2. **Create implementations** for each backend:
```typescript
// Local implementation (Rust-based)
export class LocalGenerateImageRepo extends BaseGenerateImageRepo {
  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const result = await invoke<string>("generate_image", {
      prompt: input.prompt,
      width: input.width,
      height: input.height,
    });
    return { imageBase64: result };
  }
}

// External service implementation (e.g., local Stable Diffusion)
export class SDWebuiGenerateImageRepo extends BaseGenerateImageRepo {
  constructor(private baseUrl: string) { super(); }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const response = await fetch(`${this.baseUrl}/sdapi/v1/txt2img`, {
      method: "POST",
      body: JSON.stringify({ prompt: input.prompt, width: input.width, height: input.height }),
    });
    const data = await response.json();
    return { imageBase64: data.images[0] };
  }
}
```

3. **Add state for model selection** in `src/state/settings.state.ts`
4. **Create settings UI** in `src/components/settings/`
5. **Wire up repo selection** in `src/repos/index.ts`

## Step 1: Define Model Metadata (Rust)

### Location: `src-tauri/src/system/models.rs`

Define an enum for your model sizes and their metadata:

```rust
#[derive(Debug, Clone, Copy, Default)]
pub enum WhisperModelSize {
    Tiny,
    #[default]
    Base,
    Small,
    Medium,
}

impl WhisperModelSize {
    pub fn filename(&self) -> &'static str {
        match self {
            Self::Tiny => "ggml-tiny.bin",
            Self::Base => "ggml-base.bin",
            Self::Small => "ggml-small.bin",
            Self::Medium => "ggml-medium.bin",
        }
    }

    pub fn size_bytes(&self) -> u64 {
        match self {
            Self::Tiny => 77_000_000,
            Self::Base => 148_000_000,
            Self::Small => 488_000_000,
            Self::Medium => 1_530_000_000,
        }
    }
}
```

### Model Download URLs

Models are downloaded from HuggingFace by default. You can override URLs via environment variables:

- `VOQUILL_WHISPER_MODEL_URL_{SIZE}` - Override specific model URL
- `VOQUILL_WHISPER_MODEL_URL` - Override base model URL (fallback)

## Step 2: Implement Model Download & Storage

### Location: `src-tauri/src/system/models.rs`

Key functions to implement:

```rust
pub fn ensure_whisper_model(
    app: &AppHandle,
    size: WhisperModelSize,
) -> Result<PathBuf, String> {
    let model_path = whisper_model_path(app, size)?;

    if !model_path.exists() {
        let url = model_download_url(size);
        download_model(&url, &model_path)?;
    }

    Ok(model_path)
}

fn download_model(url: &str, destination: &Path) -> Result<(), String> {
    // 1. Create temp file with .download extension
    // 2. Download via reqwest::blocking::get()
    // 3. Rename to final path on completion
    // 4. Clean up partial downloads on failure
}
```

### Storage Location

Models are stored in the platform-specific app data directory:

- **macOS**: `~/Library/Application Support/Voquill/models/`
- **Windows**: `C:\Users\{user}\AppData\Roaming\Voquill\models\`
- **Linux**: `~/.config/Voquill/models/`

Path helpers in `src-tauri/src/system/paths.rs`:

```rust
pub fn models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app.path().app_data_dir()?;
    Ok(app_data.join("models"))
}

pub fn whisper_model_path(app: &AppHandle, size: WhisperModelSize) -> Result<PathBuf, String> {
    Ok(models_dir(app)?.join(size.filename()))
}
```

## Step 3: Create the Inference Layer

### Location: `src-tauri/src/platform/whisper.rs`

Implement a transcriber struct with context caching:

```rust
pub struct WhisperTranscriber {
    contexts: Mutex<HashMap<ContextKey, WhisperContext>>,
}

impl WhisperTranscriber {
    pub fn new(model_path: &Path) -> Result<Self, String> {
        // Load initial model and create context
    }

    pub fn transcribe(
        &self,
        samples: &[f32],
        sample_rate: u32,
        request: TranscriptionRequest,
    ) -> Result<String, String> {
        // 1. Get or create context for model+device combo
        // 2. Resample audio to 16kHz if needed
        // 3. Run inference
        // 4. Return transcript
    }
}
```

### Context Caching Strategy

Cache contexts by (model_path, device) combination to avoid expensive reloads:

```rust
#[derive(Hash, Eq, PartialEq)]
struct ContextKey {
    model_path: PathBuf,
    device: DeviceVariant,
}

enum DeviceVariant {
    Auto,
    Cpu,
    Gpu { id: u32, name: String },
}
```

## Step 4: Create Tauri Commands

### Location: `src-tauri/src/commands.rs`

Expose transcription to TypeScript:

```rust
#[tauri::command]
pub async fn transcribe_audio(
    samples: Vec<f64>,
    sample_rate: u32,
    options: Option<TranscriptionOptions>,
    transcriber: State<'_, WhisperTranscriber>,
    app: AppHandle,
) -> Result<String, String> {
    let opts = options.unwrap_or_default();
    let model_size = parse_model_size(&opts.model_size)?;

    // Ensure model is downloaded
    let model_path = ensure_whisper_model(&app, model_size)?;

    // Build request
    let request = TranscriptionRequest {
        model_path: Some(model_path),
        device: opts.device.map(parse_device),
        initial_prompt: opts.initial_prompt,
        language: opts.language,
    };

    // Run transcription
    let samples_f32: Vec<f32> = samples.iter().map(|&s| s as f32).collect();
    transcriber.transcribe(&samples_f32, sample_rate, request)
}
```

### Register Command

In `src-tauri/src/app.rs`, add the command to the invoke handler:

```rust
.invoke_handler(tauri::generate_handler![
    // ... other commands
    transcribe_audio,
    list_gpus,
])
```

## Step 5: Initialize on App Startup

### Location: `src-tauri/src/app.rs`

Download default model and create transcriber during setup:

```rust
pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // Download default model (blocking)
    let default_size = WhisperModelSize::default();
    let model_path = ensure_whisper_model(&app.handle(), default_size)?;

    // Create and manage transcriber
    let transcriber = WhisperTranscriber::new(&model_path)?;
    app.manage(transcriber);

    Ok(())
}
```

## Step 6: Create TypeScript Repository

### Location: `src/repos/transcribe-audio.repo.ts`

```typescript
export class LocalTranscribeAudioRepo extends BaseTranscribeAudioRepo {
  protected getSegmentDurationSec(): number {
    return 120; // 2-minute segments
  }

  protected getOverlapDurationSec(): number {
    return 5;
  }

  protected getBatchChunkCount(): number {
    return 1; // Sequential processing
  }

  async transcribeSegment(input: TranscribeSegmentInput): Promise<TranscribeSegmentOutput> {
    const options = await this.resolveTranscriptionOptions();

    const transcript = await invoke<string>("transcribe_audio", {
      samples: Array.from(input.samples),
      sampleRate: input.sampleRate,
      options: {
        modelSize: options.modelSize,
        device: options.device,
        initialPrompt: options.initialPrompt,
        language: options.language,
      },
    });

    return { text: transcript };
  }

  private async resolveTranscriptionOptions() {
    const settings = useAppStore.getState().settings.aiTranscription;
    return {
      modelSize: settings.modelSize,
      device: this.parseDevice(settings.device),
      initialPrompt: await buildPromptWithDictionary(),
      language: settings.language,
    };
  }
}
```

### Repository Selection

In `src/repos/index.ts`, select the repo based on user settings:

```typescript
export function getTranscribeRepo(): BaseTranscribeAudioRepo {
  const mode = useAppStore.getState().settings.aiTranscription.mode;

  switch (mode) {
    case "local":
      return new LocalTranscribeAudioRepo();
    case "api":
      return new GroqTranscribeAudioRepo();
    case "cloud":
      return new CloudTranscribeAudioRepo();
  }
}
```

## Step 7: Add State Management

### Location: `src/state/settings.state.ts`

Define state for model settings:

```typescript
interface SettingsTranscriptionState {
  mode: "local" | "api" | "cloud";
  modelSize: string;
  device: string;
  gpuEnumerationEnabled: boolean;
}

const defaultTranscriptionSettings: SettingsTranscriptionState = {
  mode: "local",
  modelSize: "base",
  device: "cpu",
  gpuEnumerationEnabled: false,
};
```

### Location: `src/actions/user.actions.ts`

Create actions to update settings:

```typescript
export function setPreferredTranscriptionModelSize(modelSize: string) {
  produceAppState((draft) => {
    draft.settings.aiTranscription.modelSize = modelSize;
  });
  persistAiPreferences();
}

export function setPreferredTranscriptionDevice(device: string) {
  produceAppState((draft) => {
    draft.settings.aiTranscription.device = device;
  });
  persistAiPreferences();
}
```

## Step 8: Build the Settings UI

### Location: `src/components/settings/AITranscriptionConfiguration.tsx`

```tsx
const MODEL_OPTIONS = [
  { value: "tiny", label: "Tiny (77 MB)", helper: "Fastest, lowest accuracy" },
  { value: "base", label: "Base (148 MB)", helper: "Great balance of speed and accuracy" },
  { value: "small", label: "Small (488 MB)", helper: "Recommended with GPU acceleration" },
  { value: "medium", label: "Medium (1.53 GB)", helper: "Highest accuracy, slower on CPU" },
];

export function ModelSizeSelector() {
  const modelSize = useAppStore((s) => s.settings.aiTranscription.modelSize);

  return (
    <Select
      value={modelSize}
      onChange={(value) => setPreferredTranscriptionModelSize(value)}
    >
      {MODEL_OPTIONS.map((opt) => (
        <SelectOption key={opt.value} value={opt.value}>
          {opt.label}
          <span className="helper">{opt.helper}</span>
        </SelectOption>
      ))}
    </Select>
  );
}
```

### GPU Selection

```tsx
export function DeviceSelector() {
  const device = useAppStore((s) => s.settings.aiTranscription.device);
  const gpuEnabled = useAppStore((s) => s.settings.aiTranscription.gpuEnumerationEnabled);
  const { gpus, loading } = useSupportedDiscreteGpus(gpuEnabled);

  return (
    <Select
      value={device}
      onChange={(value) => setPreferredTranscriptionDevice(value)}
    >
      <SelectOption value="cpu">CPU</SelectOption>
      {gpus.map((gpu, i) => (
        <SelectOption key={i} value={`gpu-${i}`}>
          GPU · {gpu.name} ({gpu.backend})
        </SelectOption>
      ))}
    </Select>
  );
}
```

## Step 9: GPU Detection

### Tauri Command

```rust
#[tauri::command]
pub async fn list_gpus() -> Result<Vec<GpuAdapterInfo>, String> {
    // Run in child process for stability
    // Returns Vulkan/Metal devices with metadata
}
```

### React Hook

Location: `src/hooks/gpu.hooks.ts`

```typescript
export function useSupportedDiscreteGpus(active: boolean) {
  const [gpus, setGpus] = useState<GpuInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;

    setLoading(true);
    invoke<GpuInfo[]>("list_gpus")
      .then((result) => {
        // Filter for discrete GPUs with Vulkan/Metal backend
        const supported = result.filter(
          (g) => g.backend === "Vulkan" && g.deviceType === "DiscreteGpu"
        );
        setGpus(supported);
      })
      .finally(() => setLoading(false));
  }, [active]);

  return { gpus, loading };
}
```

## Alternative: External Service Integration (Ollama Pattern)

If you don't need to embed the model in Rust, you can integrate with an external service like Ollama. This is simpler and more flexible.

### Step A: Create the Repository

Location: `src/repos/my-local-service.repo.ts`

```typescript
import { fetch } from "@tauri-apps/plugin-http";
import { BaseRepo } from "./base.repo";

export abstract class BaseMyServiceRepo extends BaseRepo {
  abstract checkAvailability(): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;
  abstract runInference(input: MyInput): Promise<MyOutput>;
}

export class MyLocalServiceRepo extends BaseMyServiceRepo {
  private serviceUrl: string;
  private apiKey?: string;

  constructor(serviceUrl: string, apiKey?: string) {
    super();
    this.serviceUrl = serviceUrl;
    this.apiKey = apiKey;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(this.serviceUrl, {
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const response = await fetch(`${this.serviceUrl}/api/models`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return data.models.map((m: { name: string }) => m.name);
  }

  async runInference(input: MyInput): Promise<MyOutput> {
    const response = await fetch(`${this.serviceUrl}/api/generate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
      }),
    });
    return response.json();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
}
```

### Step B: Add Settings State

Location: `src/state/settings.state.ts`

```typescript
interface MyServiceSettings {
  enabled: boolean;
  serviceUrl: string;
  selectedModel: string | null;
  apiKey?: string;
}

const defaultMyServiceSettings: MyServiceSettings = {
  enabled: false,
  serviceUrl: "http://localhost:11434",
  selectedModel: null,
};
```

### Step C: Create Model Picker Component

Location: `src/components/settings/MyServiceModelPicker.tsx`

```tsx
export function MyServiceModelPicker() {
  const settings = useAppStore((s) => s.settings.myService);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!settings.enabled) return;

    const repo = new MyLocalServiceRepo(settings.serviceUrl, settings.apiKey);

    setLoading(true);
    repo.checkAvailability()
      .then((ok) => {
        setAvailable(ok);
        if (ok) return repo.getAvailableModels();
        return [];
      })
      .then(setModels)
      .finally(() => setLoading(false));
  }, [settings.enabled, settings.serviceUrl, settings.apiKey]);

  if (!available) {
    return <ServiceUnavailableMessage url={settings.serviceUrl} />;
  }

  return (
    <Select
      value={settings.selectedModel}
      onChange={(model) => setMyServiceModel(model)}
    >
      {models.map((model) => (
        <SelectOption key={model} value={model}>{model}</SelectOption>
      ))}
    </Select>
  );
}
```

### Step D: Wire Up Repo Selection

Location: `src/repos/index.ts`

```typescript
export function getMyInferenceRepo(): BaseMyServiceRepo {
  const settings = getAppState().settings.myService;

  if (settings.enabled && settings.selectedModel) {
    return new MyLocalServiceRepo(
      settings.serviceUrl,
      settings.selectedModel,
      settings.apiKey
    );
  }

  // Fallback to cloud or API
  return new CloudMyServiceRepo();
}
```

### Key Differences from Embedded Models

| Aspect | Embedded (Whisper) | External Service (Ollama) |
|--------|-------------------|---------------------------|
| Model storage | App manages downloads | User/service manages |
| Startup | Model loads with app | Service runs independently |
| Rust code | Required for inference | Not needed (HTTP only) |
| Crash isolation | Shares process | Separate process |
| User setup | Automatic | Manual (start service) |
| Model selection | Hardcoded sizes | Dynamic from service |

### Checking Service Availability

Always check if the external service is running before showing model options:

```typescript
const repo = new MyLocalServiceRepo(url);
const isAvailable = await repo.checkAvailability();

if (!isAvailable) {
  // Show setup instructions or disable feature
}
```

## Step 10: Child Process Pattern (Sidecar)

This app uses a "self-spawning child process" pattern for operations that need isolation from the main process. This is used for GPU enumeration and keyboard listening, and can be extended for model inference if needed.

### Why Use Child Processes?

1. **Crash isolation** - GPU driver crashes won't bring down the main app
2. **Thread requirements** - Some libraries (like rdev for keyboard) need specific thread setup
3. **Permission isolation** - Child processes can have different permission contexts

### How It Works

The same executable runs in different "modes" based on environment variables. The dispatch happens in `src-tauri/src/main.rs`:

```rust
fn main() {
    // Check for child process modes BEFORE starting Tauri
    if std::env::var("VOQUILL_GPU_ENUMERATOR").as_deref() == Ok("1") {
        // Run GPU enumeration and exit
        desktop_lib::system::gpu::run_gpu_enumerator_process();
        return;
    }

    if std::env::var("VOQUILL_KEYBOARD_LISTENER").as_deref() == Ok("1") {
        // Run keyboard listener and exit
        desktop_lib::platform::keyboard::run_listener_process();
        return;
    }

    // Normal app startup
    desktop_lib::app::build().run(tauri::generate_context!());
}
```

### Spawning a Child Process

Location: `src-tauri/src/system/gpu.rs`

```rust
fn enumerate_gpus_in_child_process() -> Vec<GpuAdapterInfo> {
    // Get path to current executable
    let exe = std::env::current_exe()?;

    // Spawn self with mode env var
    let mut command = Command::new(exe);
    command
        .env("VOQUILL_GPU_ENUMERATOR", "1")  // Trigger child mode
        .stdin(Stdio::null())
        .stdout(Stdio::piped())   // Capture output
        .stderr(Stdio::inherit()); // Share stderr for logging

    // Windows: hide console window
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command.spawn()?;

    // Read JSON output from stdout
    let mut output = String::new();
    child.stdout.take().unwrap().read_to_string(&mut output)?;
    child.wait()?;

    // Parse result
    serde_json::from_str(&output)?
}
```

### Child Process Entry Point

```rust
pub fn run_gpu_enumerator_process() -> Result<(), String> {
    // Do the actual work
    let gpus = enumerate_gpus_directly();

    // Output JSON to stdout (parent reads this)
    let json = serde_json::to_string(&gpus)?;
    println!("{}", json);

    Ok(())
}
```

### Adding a New Child Process Mode

To add model inference as a child process (useful for crash isolation):

1. **Add env var check in main.rs:**
```rust
if std::env::var("VOQUILL_MODEL_INFERENCE").as_deref() == Ok("1") {
    desktop_lib::platform::whisper::run_inference_process();
    return;
}
```

2. **Create the child process entry point:**
```rust
// In platform/whisper.rs
pub fn run_inference_process() -> Result<(), String> {
    // Read input from stdin or env var
    let input: InferenceInput = serde_json::from_str(&std::env::var("VOQUILL_INFERENCE_INPUT")?)?;

    // Run inference
    let result = transcribe_samples(&input.samples, input.sample_rate, input.model_path)?;

    // Output to stdout
    println!("{}", serde_json::to_string(&result)?);
    Ok(())
}
```

3. **Spawn from main process:**
```rust
fn transcribe_in_child(input: &InferenceInput) -> Result<String, String> {
    let exe = std::env::current_exe()?;
    let input_json = serde_json::to_string(input)?;

    let output = Command::new(exe)
        .env("VOQUILL_MODEL_INFERENCE", "1")
        .env("VOQUILL_INFERENCE_INPUT", input_json)
        .output()?;

    String::from_utf8(output.stdout)
}
```

### Communication Patterns

**Simple (GPU enumeration):** Child outputs JSON to stdout, parent reads it.

**Streaming (Keyboard listener):** Child connects to parent via TCP socket, sends events as newline-delimited JSON.

```rust
// Parent: bind socket and pass port to child
let listener = TcpListener::bind(("127.0.0.1", 0))?;
let port = listener.local_addr()?.port();

Command::new(exe)
    .env("VOQUILL_KEYBOARD_LISTENER", "1")
    .env("VOQUILL_KEYBOARD_PORT", port.to_string())
    .spawn()?;

// Child: connect back to parent
let stream = TcpStream::connect(("127.0.0.1", port))?;
// Send events as JSON lines
writeln!(stream, "{}", serde_json::to_string(&event)?)?;
```

### When to Use Child Processes

Use this pattern when:
- **Driver/library crashes** could bring down the main app (GPU enumeration)
- **Special thread requirements** conflict with Tauri's event loop (keyboard hooks on Linux)
- **Long-running isolated work** should not block the UI
- **Memory isolation** is needed (large model inference)

Avoid when:
- The operation is fast and stable
- You need tight integration with Tauri state
- The overhead of process spawning is too high

## End-to-End Flow Summary

```
1. User selects model size in Settings UI
       ↓
2. Action updates Zustand state + persists to database
       ↓
3. User starts recording → audio samples captured
       ↓
4. LocalTranscribeAudioRepo.transcribeAudio() called
       ↓
5. Reads settings, invokes "transcribe_audio" Tauri command
       ↓
6. Rust command:
   - Parses model size
   - Checks if model file exists
   - Downloads from HuggingFace if missing (blocking)
   - Creates TranscriptionRequest with model path + device
   - Calls WhisperTranscriber.transcribe()
       ↓
7. WhisperTranscriber:
   - Gets/creates WhisperContext (cached by model+device)
   - Resamples audio to 16kHz
   - Runs inference
   - Returns transcript string
       ↓
8. Transcript returned to TypeScript for post-processing
```

## Key Technical Notes

1. **Model downloads are blocking** - First transcription with a new model size will pause during download with no progress indication.

2. **Context caching** - Each (model_path, device) combination is cached separately. Switching models or GPUs has memory cost.

3. **GPU detection runs in child process** - Protects main process from driver crashes.

4. **Automatic GPU fallback** - If GPU inference fails, system falls back to CPU without notification.

5. **Default model on startup** - Base model downloads on app startup if missing. Startup fails if download fails.

6. **Environment variables**:
   - `VOQUILL_WHISPER_DISABLE_GPU=1` - Force CPU-only mode
   - `VOQUILL_WHISPER_MODEL_URL_{SIZE}` - Override model download URL

## Quick Reference

### Decision Tree: Which Pattern to Use?

```
Is the model core functionality that must work offline?
├─ Yes → Does it need crash isolation?
│        ├─ Yes → Pattern 3: Child Process
│        └─ No  → Pattern 1: Embedded (Whisper-style)
└─ No  → Is it user-provided/configurable?
         ├─ Yes → Pattern 2: External Service (Ollama-style)
         └─ No  → Consider cloud API instead
```

### File Locations Summary

**Rust (Embedded Models)**
| Purpose | Location |
|---------|----------|
| Model metadata & download | `src-tauri/src/system/models.rs` |
| Model storage paths | `src-tauri/src/system/paths.rs` |
| Inference implementation | `src-tauri/src/platform/whisper.rs` |
| Tauri commands | `src-tauri/src/commands.rs` |
| App initialization | `src-tauri/src/app.rs` |
| Child process dispatch | `src-tauri/src/main.rs` |

**TypeScript (All Patterns)**
| Purpose | Location |
|---------|----------|
| Repository interfaces | `src/repos/*.repo.ts` |
| Repository selection | `src/repos/index.ts` |
| State definitions | `src/state/settings.state.ts` |
| State actions | `src/actions/user.actions.ts` |
| Settings UI | `src/components/settings/*.tsx` |
| GPU hooks | `src/hooks/gpu.hooks.ts` |

### Existing Implementations to Reference

| Model Type | Pattern | Files |
|------------|---------|-------|
| Whisper (STT) | Embedded | `whisper.rs`, `models.rs`, `LocalTranscribeAudioRepo` |
| Ollama (LLM) | External Service | `ollama.repo.ts`, `OllamaGenerateTextRepo` |
| GPU Enumeration | Child Process | `gpu.rs`, `main.rs` |
| Groq/OpenAI | Cloud API | `GroqTranscribeAudioRepo`, `OpenAIGenerateTextRepo` |
