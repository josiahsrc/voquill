# Voquill Desktop

Cross-platform voice-to-text desktop application built with Tauri 2 (Rust + TypeScript/React).

## Development

### Prerequisites

- Node.js 18+
- Rust 1.77+
- Platform-specific dependencies (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

### Running Locally

Use platform-specific commands (required for native features):

```bash
npm run dev:mac          # macOS
npm run dev:windows      # Windows
npm run dev:linux        # Linux
```

> **Note:** Do not use `npm run dev` directly—use the platform-specific commands above.

### Build & Quality

```bash
npm run build            # Build frontend
npm run lint             # ESLint
npm run check-types      # TypeScript type checking
npm run test:webdriver   # E2E smoke tests
```

## Project Structure

```
src/
├── actions/         # Business logic orchestration
├── components/      # React components
├── hooks/           # Reusable React hooks
├── repos/           # Data access (local SQLite / cloud Firebase)
├── state/           # Zustand state slices
├── types/           # TypeScript types
└── utils/           # Pure utility functions

src-tauri/
└── src/
    ├── commands.rs  # Tauri commands (TypeScript ↔ Rust bridge)
    ├── app.rs       # Application setup
    ├── db/          # SQLite migrations and queries
    ├── domain/      # Rust domain models
    ├── platform/    # Platform-specific code (audio, keyboard, whisper)
    └── system/      # System utilities (models, GPU, tray)
```

## Architecture

**"Rust is the API, TypeScript is the Brain"**

- All business logic lives in TypeScript
- Rust provides capabilities (audio recording, transcription, system APIs)
- Zustand is the single source of truth for state

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FLAVOR` | Environment: `dev`, `prod`, or `emulators` (default) |
| `VITE_USE_EMULATORS` | Connect to Firebase emulators |
| `VOQUILL_ENABLE_DEVTOOLS` | Open dev tools on startup |
| `VOQUILL_DESKTOP_PLATFORM` | Override platform detection |

## Internationalization

Uses [react-intl](https://formatjs.io/docs/react-intl/) with auto-generated message IDs.

```bash
npm run i18n:extract     # Extract messages to en.json
npm run i18n:sync        # Sync to other locales
```

### Adding Translations

1. Use `<FormattedMessage defaultMessage="..." />` in components
2. Run `npm run i18n:extract` to update `src/i18n/locales/en.json`
3. Run `npm run i18n:sync` to propagate keys to other locales
4. Add translations to each locale file

## Testing

```bash
# Install tauri-driver (one-time)
cargo install tauri-driver

# Run E2E tests
npm run test:webdriver
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
