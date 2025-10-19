# Desktop Architecture

The desktop app is built using [Tauri](https://tauri.app/), which combines a Rust backend with a TypeScript/React frontend. The architecture follows a clear separation of concerns: **Rust serves as an API layer providing native capabilities, while TypeScript handles all business logic and state management.**

## Architecture Philosophy

**Rust is the API, TypeScript is the Brain**

By treating the Rust layer as a pure API rather than a place for business logic, we keep all application state centralized in TypeScript. This design decision provides several key benefits:

- **Single source of truth**: All business logic and state live in one place (TypeScript), making the app easier to reason about and maintain
- **Flexibility**: The same TypeScript business logic can work with either local (SQLite) or remote backends without modification
- **Simplicity**: Rust code stays focused on what it does best—native platform capabilities and data persistence—without duplicating state or logic

## Data Flow

The application follows a unidirectional data flow:

```
User Interaction / Native Events
         ↓
   TypeScript Logic
         ↓
    Repo Layer (decides local vs. remote)
         ↓
   Rust API (via Tauri commands)
         ↓
  SQLite / Remote Backend
```

### Example: Transcription Flow

1. **Native Event**: Rust detects a recording event and emits it via Tauri's event system
2. **TypeScript Handles Business Logic**: Event listener in TypeScript receives the event and determines what to do (e.g., process, validate, update UI state)
3. **Repo Layer Decision**: TypeScript calls the appropriate repo method, which decides whether to persist locally or remotely
4. **Rust API Call**: If local storage is needed, TypeScript invokes a Tauri command (e.g., `transcription_create`)
5. **Data Persistence**: Rust receives the command and performs the database operation in SQLite

## Layer Responsibilities

### Rust Layer (API)
- **Platform capabilities**: Audio recording, keyboard hooks, system tray, OS-specific features
- **Data persistence**: SQLite database operations via Tauri commands
- **Event emission**: Notifying TypeScript of native events (recording levels, key presses, etc.)
- **No business logic**: Rust does not make decisions about what to do with data

### TypeScript Layer (Business Logic)
- **Application state**: Single Redux-like store managing all app state
- **Business logic**: All decisions about data processing, validation, routing
- **Event handling**: Listening to Rust events and orchestrating responses
- **UI rendering**: React components driven by centralized state
- **Backend abstraction**: Repos can switch between local and remote backends transparently

### Tauri Commands (The Bridge)

Tauri commands defined in `src-tauri/src/commands.rs` serve as the API contract:

```rust
#[tauri::command]
pub async fn transcription_create(
    transcription: Transcription,
    database: State<'_, Database>,
) -> Result<Transcription, String> {
    // Simple: just persist and return
    db::insert_transcription(database.pool(), &transcription).await
}
```

TypeScript consumes these commands via the repo layer:

```typescript
export class LocalTranscriptionRepo {
  async createTranscription(transcription: Transcription): Promise<Transcription> {
    return await invoke("transcription_create", { transcription });
  }
}
```

## Benefits of This Architecture

1. **Maintainability**: Business logic changes only require TypeScript updates
2. **Testability**: Core logic can be tested in TypeScript without Rust dependencies
3. **State Management**: No confusion about where state lives—it's always in TypeScript
4. **Backend Flexibility**: Easy to switch between local SQLite and remote Firebase/cloud backends
5. **Clear Boundaries**: Each layer has well-defined responsibilities and interfaces 
