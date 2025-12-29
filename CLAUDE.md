# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voquill is a cross-platform voice-to-text desktop application built with Tauri (Rust + TypeScript/React). The repository is a Turborepo monorepo containing the desktop app, marketing website, Firebase backend, and shared packages.

**Key architectural principle: "Rust is the API, TypeScript is the Brain"**

- ALL business logic lives in TypeScript (never duplicated in Rust)
- Rust provides pure API capabilities without decision-making
- Single source of truth for state is Zustand in TypeScript

## Development Commands

### Desktop App (apps/desktop)

**Run in development (always use platform-specific commands):**

```bash
npm run dev:mac          # macOS
npm run dev:windows      # Windows
npm run dev:linux        # Linux with CPU-only Whisper
npm run dev:linux:gpu    # Linux with Vulkan GPU acceleration
```

**Build and quality checks:**

```bash
npm run build            # Build frontend (TypeScript → Vite)
npm run lint             # ESLint
npm run check-types      # TypeScript type checking
npm run test:webdriver   # E2E smoke tests

# Internationalization
npm run i18n:extract     # Extract messages to en.json
npm run i18n:sync        # Sync message IDs to other locales
```

**Environment variables:**

- `VOQUILL_DESKTOP_PLATFORM` - Override platform detection (darwin/win32/linux)
- `VITE_FLAVOR` - Environment flavor (dev/prod/emulators, defaults to emulators)
- `VITE_USE_EMULATORS` - Point to Firebase emulators (default true in emulators flavor)
- `VOQUILL_WHISPER_DISABLE_GPU` - Force CPU-only Whisper inference
- `VOQUILL_ENABLE_DEVTOOLS` - Open dev tools automatically on startup (useful for debugging production builds)

### Root-level Commands

```bash
npm run build            # Build all workspaces via Turborepo
npm run lint             # Lint all workspaces
npm run check-types      # Type-check all workspaces
npm run test             # Run all tests
```

**Important:** Do NOT use `npm run dev` or `turbo dev` for the desktop app; it manages its own watcher.

### Firebase Functions (apps/firebase/functions)

```bash
npm run dev              # Watch TypeScript + start emulators
npm run build            # esbuild bundle
npm run test             # Run Vitest tests
```

### Marketing Site (apps/web)

```bash
npm run dev              # Start Astro dev server
```

## Architecture & Code Organization

### Data Flow

```
User Event / Native Event
    ↓
TypeScript Actions (business logic in src/actions/)
    ↓
Repos (decide local vs remote in src/repos/)
    ↓
Tauri Commands (Rust API bridge in src-tauri/src/commands.rs)
    ↓
SQLite / Whisper / External APIs
```

### Desktop TypeScript Structure (apps/desktop/src)

- `/state/` - Zustand state slices (one per page/feature)
  - `app.state.ts` - Root state definition with entity maps (`userById`, `transcriptionById`, etc.)
- `/utils/` - Pure functions that read/modify state (state always passed as parameter)
- `/actions/` - Orchestrate flows by composing utilities and calling repos
- `/repos/` - Abstract local (SQLite via Tauri) vs remote (Firebase/Groq) backends
  - Pattern: `BaseXxxRepo` defines interface, `LocalXxxRepo` / `CloudXxxRepo` implement
  - Conversion functions: `toLocalXxx()` / `fromLocalXxx()` for Tauri boundary
- `/components/` - React components (pages have folders, `common/` for reusable)
- `/hooks/` - Reusable React hooks
- `/types/` - App-specific types (shared domain types in `@repo/types`)
- `/store/index.ts` - Zustand store setup with Immer (exports `useAppStore`, `produceAppState`)

### Rust Backend Structure (apps/desktop/src-tauri/src)

- `/commands.rs` - All Tauri commands exposed to TypeScript (40+ commands)
- `/app.rs` - Application setup (plugins, database, state management, overlay window)
- `/db/` - Database layer
  - `/migrations/*.sql` - Sequential SQLite migrations (000-018)
  - `*_queries.rs` - CRUD operations for each entity
  - `tone_seed.rs` - Seeds default tones on first launch
- `/domain/` - Rust domain models (match TypeScript types in `@repo/types`)
- `/platform/` - Platform-specific implementations
  - `audio.rs` - Audio recording via cpal
  - `whisper.rs` - Local Whisper inference with context caching
  - `keyboard.rs` - Global keyboard hooks via rdev
  - `input.rs` - Text injection (paste)
  - `macos/notch_overlay.rs` - macOS notch integration
- `/system/` - System utilities
  - `models.rs` - Whisper model download/management
  - `gpu.rs` - GPU enumeration via wgpu
  - `crypto.rs` - API key encryption (HMAC-SHA256)
  - `tray.rs` - System tray icon
- `/state/` - Managed Tauri state (database pool, OAuth config)

## Key Technical Patterns

### Tauri Command Pattern

**Rust side (commands.rs):**

```rust
#[tauri::command]
pub async fn transcription_create(
    transcription: Transcription,
    database: State<'_, OptionKeyDatabase>,
) -> Result<Transcription, String> {
    db::transcription_queries::insert_transcription(database.pool(), &transcription)
        .await
        .map_err(|err| err.to_string())
}
```

**TypeScript side (repos/):**

```typescript
async createTranscription(transcription: Transcription): Promise<Transcription> {
  const local = toLocalTranscription(transcription);
  const result = await invoke("transcription_create", { transcription: local });
  return fromLocalTranscription(result);
}
```

### State Management with Zustand

```typescript
// Read state
const transcriptions = useAppStore((state) => state.transcriptions.items);

// Write state (immutable via Immer)
produceAppState((draft) => {
  draft.transcriptions.items.push(newTranscription);
});
```

### Database Migrations

- Migrations run automatically on app startup via `tauri-plugin-sql`
- Location: `apps/desktop/src-tauri/src/db/migrations/`
- Format: `NNN_description.sql` (sequential numbering)
- Registered in `db/mod.rs` migrations() function

### Internationalization Workflow

1. Use `<FormattedMessage defaultMessage="..." />` or `useIntl()` in components (NO id prop)
2. Run `npm run i18n:extract` to extract messages to `src/i18n/locales/en.json`
3. Run `npm run i18n:sync` to propagate new keys to other locale files
4. Manually add translations to each locale JSON file

### Repository Selection

Repos are instantiated based on user settings and auth state:

```typescript
// Example from repos/index.ts
const transcribeRepo =
  settings.mode === "api"
    ? new GroqTranscribeAudioRepo(apiKey)
    : settings.mode === "cloud"
      ? new CloudTranscribeAudioRepo()
      : new LocalTranscribeAudioRepo();
```

## AI/LLM Integration

### Transcription Flow

1. **Audio capture** - Platform-specific via `cpal` library (platform/audio.rs)
2. **Three transcription modes:**
   - **Local:** whisper-rs inference (CPU or GPU via Vulkan/Metal)
   - **API:** Direct Groq Whisper API (whisper-large-v3-turbo)
   - **Cloud:** Firebase function → Groq (for cloud users)
3. **Prompt includes dictionary terms** - Built in utils/prompt.utils.ts
4. **Raw transcript stored** - Saved to `raw_transcript` column

### Post-Processing with LLM

- Groq LLM (meta-llama/llama-4-scout-17b-16e-instruct) cleans up transcript
- Flow: `transcribeAndPostProcessAudio()` in actions/transcription.actions.ts
- **Tones define prompt templates** - System tones in db/tone_seed.rs:
  - Light (minimal changes), Casual, Formal, Business, Punny
- User can create custom tones with their own prompts
- Active tone selected via `user_preferences.active_tone_id`

### Dictionary System

Two types of terms (distinguished by `is_replacement` flag):

- **Glossary terms** (false) - Included in prompts for context
- **Replacement rules** (true) - Applied as transformations (e.g., "GPT" → "ChatGPT")

## Critical Non-Obvious Patterns

### API Key Encryption

- Keys encrypted with HMAC-SHA256 using secret from `VOQUILL_API_KEY_SECRET`
- Stored as: salt, hash, ciphertext, suffix (last 4 chars for display)
- Located in system/crypto.rs (NOT using system keyring despite dependency)

### Whisper Model Management

- Models downloaded to `$APPDATA/models/` on first use
- Default: `base` model (~142MB)
- Context caching by model path + device in WhisperTranscriber
- GPU detection via wgpu (can be disabled with `VOQUILL_WHISPER_DISABLE_GPU=1`)

### Keyboard Listener Child Process (Linux)

- Main process spawns child with `VOQUILL_KEYBOARD_LISTENER=1`
- Child runs rdev keyboard listener and sends events over TCP socket
- Required because rdev needs specific thread/permission setup
- Auto-respawned if crashes (500ms backoff)

### Overlay Window System

- **macOS:** Native notch overlay via Objective-C interop (platform/macos/notch_overlay.rs)
- **Windows/Linux:** Transparent Tauri window (360x80, always-on-top)
- Phase management: `idle` | `listening` | `processing`
- React component: components/overlay/OverlayRoot.tsx

### Audio Storage

- WAV files saved to `$APPDATA/transcription-audio/`
- Only last 20 transcriptions retain audio (auto-purged)
- Tauri asset protocol grants access (configured in tauri.conf.json)

### Firebase Functions Handler Pattern

- Single `handler()` function dispatches by `name` field
- Type-safe via `HandlerInput<"handler/name">` generic
- Zod validation for all inputs
- Shared handler definitions in `@repo/functions`

### Auto-Update Flow

- Channel-based releases: `desktop-dev` and `desktop-prod` tags
- GitHub Actions patches config with correct endpoint
- Signing via `TAURI_PRIVATE_KEY` (private) and public key in config

## Common Development Tasks

### Adding a New Tauri Command

1. Define command in `src-tauri/src/commands.rs`:
   ```rust
   #[tauri::command]
   pub async fn my_command(args: MyArgs) -> Result<MyResponse, String> { ... }
   ```
2. Register in `src-tauri/src/app.rs` invoke_handler macro
3. Create repo in `apps/desktop/src/repos/` to call it from TypeScript
4. Use repo in actions

### Adding a Database Migration

1. Create `NNN_description.sql` in `src-tauri/src/db/migrations/`
2. Add constant in `src-tauri/src/db/mod.rs` (e.g., `MIGRATION_NNN_SQL`)
3. Add migration to `migrations()` vector with version number
4. Update queries if needed in corresponding `*_queries.rs` file

### Adding a New Tone

Tones are seeded automatically in `db/tone_seed.rs`. To add system tones:

- Edit `seed_default_tones_if_needed()` function
- Use `Tone::new_system()` with specific ID
- Prompt template uses `{transcript}` placeholder

### Working with Firebase Emulators

1. Ensure `apps/desktop/.env.emulators` flavor is active (default)
2. Start emulators: `npm run dev --workspace apps/firebase/functions`
3. Desktop app auto-connects when `VITE_USE_EMULATORS=true`
4. Emulator ports: Auth (9099), Firestore (8760), Functions (5001), Storage (9199)
5. Use `.secret.local` for secrets when emulated

## Testing

- **Desktop E2E:** `npm run test:webdriver` (requires tauri-driver)
- **Firebase Functions:** `npm run test` in apps/firebase/functions
- **Unit tests:** Run in individual packages as needed

## Build & Release

- Desktop builds: `.github/workflows/release-desktop.yml`
- Multi-platform (macOS, Windows, Linux)
- See `docs/desktop-release.md` for release playbook
- Turbo caching configured in `turbo.json`

## Additional Resources

- Desktop architecture deep-dive: `docs/desktop-architecture.md`
- Release playbook: `docs/desktop-release.md`
- Contributor conventions: `AGENTS.md`
- Main README: `README.md`
