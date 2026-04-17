# @voquill/desktop-native-apis

Type-safe TypeScript wrappers for the Voquill desktop app's Tauri commands. A web app loaded inside the Voquill Tauri shell can import this package to call the Rust native layer (database, audio recorder, accessibility APIs, etc.) without writing raw `invoke()` strings.

## Install

```bash
pnpm add @voquill/desktop-native-apis
```

The package declares `@tauri-apps/api` as a dependency — no extra setup is needed.

## Usage

```ts
import { commands } from "@voquill/desktop-native-apis";

const user = await commands.userGetOne();
if (user.status === "ok" && user.data) {
  console.log(user.data.name);
}

const transcriptions = await commands.transcriptionList();

const result = await commands.setSystemVolume(0.5);
if (result.status === "error") {
  console.error(result.error);
}
```

Commands that return `Result<T, E>` need a `.status` check. Commands that return a value directly (no `Result`) resolve with the value.

Type definitions for every argument and return type are exported alongside the commands:

```ts
import type { Transcription, UserPreferences, PillWindowSize } from "@voquill/desktop-native-apis";
```

## Runtime requirement

The package calls `@tauri-apps/api`'s `invoke()`. It will throw if loaded outside the Voquill Tauri shell (no `window.__TAURI_INTERNALS__`). Consumer apps that render both in and out of Tauri should feature-detect:

```ts
const isTauri = !!(window as any).__TAURI_INTERNALS__;
if (isTauri) {
  const user = await commands.userGetOne();
}
```

## Regenerating bindings

`src/bindings.ts` is auto-generated from the Rust sources by [`tauri-specta`](https://github.com/specta-rs/tauri-specta). Run from the repo root after any change to `#[tauri::command]` signatures:

```bash
pnpm gen:bindings
# or directly:
./scripts/bindings.sh
```

Both delegate to `scripts/bindings.sh`, which runs the `gen_bindings` Rust binary at `apps/desktop/src-tauri/src/bin/gen_bindings.rs`. That binary walks every annotated command and emits `packages/desktop-native-apis/src/bindings.ts`. After regenerating, rebuild the package:

```bash
pnpm --filter @voquill/desktop-native-apis build
```

### Adding a new command

1. Add `#[tauri::command]` and `#[specta::specta]` to the new function in `apps/desktop/src-tauri/src/commands.rs`.
2. Register the command in both `apps/desktop/src-tauri/src/app.rs` (invoke handler) and `apps/desktop/src-tauri/src/bin/gen_bindings.rs` (collect_commands macro).
3. Derive `specta::Type` on any new argument or return types that aren't primitives.
4. Run `pnpm gen:bindings`.
