# Mobile local/on-device transcription design

**Date:** 2026-04-11
**Status:** Approved

## Problem

Voquill mobile stores a transcription mode preference, but the keyboard/IME currently only executes cloud and API transcription paths. This issue adds a true built-in local/on-device transcription mode for mobile that matches the macOS product behavior: users can download models locally, choose the active local model, and transcribe without depending on cloud or API transcription.

## Goals

- Add a first-class `local` transcription mode on both iOS and Android.
- Let users download, validate, delete, and select local transcription models from mobile settings.
- Keep local-model behavior and UX semantics aligned with the macOS app.
- Preserve the existing independent post-processing mode selection.

## Non-goals

- Making post-processing fully local in this issue.
- Reusing the desktop sidecar/service architecture verbatim on mobile.
- Shipping a reduced MVP that only supports one fixed local model.

## Current state

- Mobile settings persist transcription mode and related configuration into shared platform storage.
- The iOS keyboard and Android IME resolve `api` explicitly and otherwise fall back to cloud transcription.
- Desktop already has a stronger local transcription contract, including model status, download, delete, selection, device choice, and model metadata.

## Decision summary

Use platform-native local transcription engines on iOS and Android, but keep a shared product contract with macOS:

- Mobile continues to expose `Local`, `API`, and `Cloud` transcription modes.
- The mobile app owns model catalog presentation, download/delete/validation state, and selected-model persistence.
- The keyboard extension on iOS and the Android IME execute dictation using the selected local model through a new local transcription repository path.
- If local mode is selected but no valid model is available, the product shows an actionable local-model error state and does not silently route audio to cloud.

## Architecture

### 1. Settings and model management

The Flutter mobile app becomes the source of truth for local-model management. It exposes:

- local mode selection
- local model list
- download progress
- delete actions
- active model selection
- macOS-aligned model metadata, including size and user-facing accuracy/speed/language-support descriptors

This screen should preserve the behavior and UX expectations of the macOS app even if the native implementation details differ per platform.

### 2. Shared configuration

The selected transcription mode, selected local model, and model-management state are persisted through the same platform bridge layer already used for keyboard configuration:

- **iOS:** `AppDelegate` writes shared values into the App Group container. Model files and a local-model manifest also live in the App Group so the keyboard extension can read them.
- **Android:** `MainActivity` writes shared values into the existing keyboard preferences. Model files live in app-private storage that the IME service can read under the same package.

### 3. Local transcription execution

Each platform adds a native local transcription adapter behind the existing repo selection flow:

- `cloud` -> existing cloud repo
- `api` -> existing BYOK/API repo
- `local` -> new local repo

The keyboard/IME should keep its existing dictation flow: capture audio, resolve language and prompt context, transcribe, optionally post-process, insert text, and save transcription metadata. The only change is the transcription backend selected for `local`.

### 4. Platform-native runtime

Mobile should not copy the desktop sidecar/service pattern directly. Instead:

- **iOS:** use a native local runtime suitable for the host app and keyboard extension, with model files shared through the App Group container.
- **Android:** use a native or JNI-backed local runtime suited for the IME lifecycle and app storage model.

The runtime contract should still mirror desktop semantics closely enough that model identity, selected model, and local-mode metadata stay consistent across products.

## Data flow

1. User opens mobile settings and selects `Local`.
2. User downloads one or more local models and selects an active model.
3. App validates the model and writes the selected mode/model into shared storage.
4. Keyboard/IME starts dictation and reads the shared configuration.
5. Keyboard/IME builds the existing localized prompt and language inputs.
6. Keyboard/IME routes audio through the local transcription repo.
7. Raw transcript continues through the current insertion, history, and optional post-processing flow.

## Error handling

- No silent fallback from local transcription to cloud or API.
- Missing, partial, corrupt, or invalid models must remain non-selectable.
- If the selected local model is unavailable, show an actionable message such as downloading a model in the app or choosing a smaller one.
- Download failures leave the model in a non-ready state and keep the error visible in the model-management UI.
- If local transcription succeeds but post-processing fails, keep the existing behavior of using the raw transcript.

## Testing

Cover the highest-risk seams:

- settings sync from app to keyboard/IME on both platforms
- repo selection for `local`, `api`, and `cloud`
- model download, validation, deletion, and selection state transitions
- missing/invalid model UX and blocked local dictation behavior
- local transcription metadata recorded with the selected model
- iOS shared-container access from host app and keyboard extension
- Android model access from both activity and IME service
- proof that local mode does not send audio through cloud/API paths implicitly

## Follow-up planning constraints

The implementation plan should keep these boundaries:

- transcription only, not full offline post-processing
- both iOS and Android in scope
- downloadable and user-selectable local models in base scope
- UX and behavior aligned with the existing macOS local-model flow
