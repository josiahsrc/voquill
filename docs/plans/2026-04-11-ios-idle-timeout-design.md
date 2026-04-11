# iOS Idle Timeout — Design Document

**Issue:** [voquill/voquill#394](https://github.com/voquill/voquill/issues/394)
**Date:** 2026-04-11

## Problem

After a user finishes dictating via the keyboard pill, `DictationService` stays in the `.active` phase with the `AVAudioEngine`, audio session, and heartbeat timer still running. The keyboard never posts `stopDictation` — only `stopRecording` (which maps to `pauseRecording()`). This causes persistent battery drain and the orange mic indicator on iOS.

## Approach

**Option B from the issue:** Add a configurable idle timeout timer in `DictationService` (Swift). When the service enters the `.active` phase (after recording pauses), start a timer. If no new recording starts before the timer fires, call `stopDictation()` to fully tear down the audio engine and session.

## Design

### 1. DictationService idle timer

**New instance property:**
- `idleTimeoutTimer: Timer?`

**Lifecycle:**
- `pauseRecording()` → calls `startIdleTimeout()`
- `resumeRecording()` → calls `stopIdleTimeout()`
- `stopDictation()` → calls `stopIdleTimeout()` (cleanup)
- Timer fires → calls `stopDictation()`

**`startIdleTimeout()` logic:**
1. Invalidate any existing timer
2. Read `voquill_idle_timeout_seconds` from shared UserDefaults (default: 120)
3. If value is `0`, return without creating a timer ("keep running" mode)
4. Create a non-repeating `Timer` with the read duration
5. On fire: guard `currentPhase == .active`, then call `stopDictation()`

**New constants in `DictationConstants`:**
- `idleTimeoutKey = "voquill_idle_timeout_seconds"`
- `defaultIdleTimeout: TimeInterval = 120.0`

### 2. Settings sync — Flutter → Native

**Flutter side:**
- `SharedPreferences` keys: `idle_timeout_seconds` (int, default 120), `idle_timeout_keep_running` (bool, default false)
- When `keep_running` is true, sync `0` as the timeout value
- Sync via `MethodChannel('com.voquill.mobile/shared')` → `setIdleTimeout`
- Sync triggers: on app launch (in existing `syncKeyboardAiConfig` flow) and on settings change

**Native side (AppDelegate):**
- New method channel case: `setIdleTimeout`
- Reads `timeoutSeconds` from args, writes to `UserDefaults(suiteName: appGroupId)` key `voquill_idle_timeout_seconds`

### 3. Settings UI

**Location:** "Processing" section in `settings_page.dart`

**New `AppListTile`** → opens bottom sheet with:
- Quick-pick chips: **1m**, **2m** (default, highlighted), **5m**
- Custom input field for arbitrary minute values
- **"Keep Running" toggle** — when ON:
  - Grays out chips and custom input
  - Shows one-time confirmation dialog:
    > "Keeping the microphone active indefinitely will drain battery and show a persistent mic indicator. Are you sure?"
  - Syncs timeout value of `0` to native
- Save button applies selection and syncs to native

### 4. Edge cases

| Scenario | Behavior |
|----------|----------|
| App killed while timer pending | Audio engine dies with process. `cleanupOnLaunch()` resets phase to idle. |
| Audio interruption during idle | Existing interruption handler calls `stopDictation()`, which also cancels idle timer. |
| Settings changed during active dictation | New value takes effect on next `pauseRecording()`. Current timer keeps its original duration. |
| Missing UserDefaults key (fresh install) | Default to 120s (2 minutes). |
| `0` timeout value | No timer created — audio engine stays active until manual stop or app termination. |

### 5. Files to modify

**iOS Native:**
- `ios/Runner/DictationConstants.swift` — add `idleTimeoutKey`, `defaultIdleTimeout`
- `ios/Runner/DictationService.swift` — add `idleTimeoutTimer`, `startIdleTimeout()`, `stopIdleTimeout()`; call from `pauseRecording()`, `resumeRecording()`, `stopDictation()`
- `ios/Runner/AppDelegate.swift` — add `setIdleTimeout` method channel handler

**Flutter:**
- `lib/widgets/settings/idle_timeout_sheet.dart` — new bottom sheet widget
- `lib/widgets/settings/settings_page.dart` — add idle timeout tile to Processing section
- `lib/actions/idle_timeout_actions.dart` — new file for get/set/sync logic
- `lib/utils/channel_utils.dart` — add `syncIdleTimeout()` helper
- `lib/actions/app_actions.dart` — call sync on app launch
