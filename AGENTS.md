# Instructions

This is an AI speech-to-text application.

## apps/desktop

The desktop application built using Tauri.

- State is managed with Zustand. A single global app state powers the whole application (`app.state.ts`).
- Shared domain types are stored as maps at the root level of the state (e.g., `userById`). Keys are lookup entities, and values are the referenced entities.
- State is organized by page. For example, the `TranscriptionsPage` has a `transcriptionsPage` slice in `app.state.ts`, defined in `transcriptions.state.ts`.
- The `utils` directory contains generic utilities that read or modify state. State is always passed into these functions.
- The `actions` directory composes utilities. It reads and mutates state and may call APIs.
- The `components` directory stores React components. Pages have their own folders, and `common` holds reusable, stateless components.
- The `hooks` directory contains reusable hooks created for clarity or convenience.
- The `types` directory contains application-specific domain types reused across the app.
- The `repos` directory defines backend strategies that use a consistent interface for local or remote backends.
- The TypeScript portion drives application state and logic. Rust acts as an API layer called from TypeScript.

## apps/web

The product website for Voquill. Built with Astro.

## packages/**

Shared packages used by both the desktop, server, and web applications. We place entities here as well as shared utilities.

## General practices

- See the `docs` directory for more on architecture, patterns, tutorials, and conventions.
- Do not run long-hanging commands like `turbo dev`; use `turbo build` instead.
- Use disabled button states for loading instead of changing button text.
- Reuse code where appropriate without overgeneralizing.
- Use the shared types from the packages where possible, e.g. `Nullable<T>`.
- When adding translations to the desktop or web app, first use <FormattedMessage>, `getIntl`, or `useIntl` in the relevant component or util (do NOT pass in an ID, only pass in a `defaultMessage`). Then run the `i18n:extract` script in the desktop app to extract messages. Finally, run the `i18n:sync` script to sync new messages to all locale files. Lastly, translate the new messages in each locale file.
