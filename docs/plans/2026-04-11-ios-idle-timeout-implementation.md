# iOS Idle Timeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a configurable idle timeout that auto-stops the DictationService audio engine after recording pauses, fixing battery drain and the persistent orange mic indicator on iOS.

**Architecture:** Timer-based approach in `DictationService` (Swift). When `pauseRecording()` enters `.active` phase, an idle timeout timer starts. If it fires before the next `resumeRecording()`, it calls `stopDictation()`. The timeout duration is user-configurable via Flutter settings UI, synced to native via MethodChannel → shared UserDefaults.

**Tech Stack:** Swift (iOS native), Dart/Flutter (settings UI), MethodChannel IPC, shared UserDefaults (app group)

---

### Task 1: Add idle timeout constants to DictationConstants.swift

**Files:**
- Modify: `mobile/ios/Runner/DictationConstants.swift`

**Step 1: Add the new constants**

Add two new static properties to `DictationConstants`:

```swift
static let idleTimeoutKey = "voquill_idle_timeout_seconds"
static let defaultIdleTimeout: TimeInterval = 120.0
```

Add them after line 20 (`maxRecordingDuration`), before `appGroupId`.

**Step 2: Verify the file compiles**

Run: `cd mobile && grep -n "idleTimeout" ios/Runner/DictationConstants.swift`
Expected: Both new lines appear.

**Step 3: Commit**

```bash
git add mobile/ios/Runner/DictationConstants.swift
git commit -m "feat(ios): add idle timeout constants

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Add idle timeout timer to DictationService.swift

**Files:**
- Modify: `mobile/ios/Runner/DictationService.swift`

**Step 1: Add the timer property**

Add after line 22 (`private var recordingTimeoutTimer: Timer?`):

```swift
private var idleTimeoutTimer: Timer?
```

**Step 2: Add startIdleTimeout() and stopIdleTimeout() methods**

Add after `stopRecordingTimeout()` (after line 212), before the `// MARK: - Heartbeat` comment:

```swift
// MARK: - Idle Timeout

private func startIdleTimeout() {
    stopIdleTimeout()
    let timeout = defaults?.double(forKey: DictationConstants.idleTimeoutKey) ?? 0
    let duration = timeout > 0 ? timeout : DictationConstants.defaultIdleTimeout
    
    // 0 means "keep running" — don't create a timer
    if defaults?.object(forKey: DictationConstants.idleTimeoutKey) != nil && timeout == 0 {
        NSLog("[VoquillApp] Idle timeout disabled (keep running mode)")
        return
    }

    NSLog("[VoquillApp] Starting idle timeout: %.0f seconds", duration)
    idleTimeoutTimer = Timer.scheduledTimer(
        withTimeInterval: duration,
        repeats: false
    ) { [weak self] _ in
        guard let self = self, self.currentPhase == .active else { return }
        NSLog("[VoquillApp] Idle timeout reached, stopping dictation")
        self.stopDictation()
    }
}

private func stopIdleTimeout() {
    idleTimeoutTimer?.invalidate()
    idleTimeoutTimer = nil
}
```

**Step 3: Call startIdleTimeout() from pauseRecording()**

In `pauseRecording()`, add `startIdleTimeout()` as the last line (after `updateLiveActivity(phase: "active")` on line 82):

```swift
startIdleTimeout()
```

**Step 4: Call stopIdleTimeout() from resumeRecording()**

In `resumeRecording()`, add `stopIdleTimeout()` as the first line after the guard (after line 87 `NSLog("[VoquillApp] resumeRecording")`):

```swift
stopIdleTimeout()
```

**Step 5: Call stopIdleTimeout() from stopDictation()**

In `stopDictation()`, add `stopIdleTimeout()` after `stopRecordingTimeout()` (after line 118):

```swift
stopIdleTimeout()
```

**Step 6: Verify**

Run: `cd mobile && grep -n "idleTimeout\|Idle timeout" ios/Runner/DictationService.swift`
Expected: All new references appear at the correct locations.

**Step 7: Commit**

```bash
git add mobile/ios/Runner/DictationService.swift
git commit -m "feat(ios): add idle timeout timer to DictationService

Starts timer on pauseRecording(), cancels on resumeRecording()/stopDictation().
Fires stopDictation() when timeout elapses in .active phase.
Reads configurable duration from shared UserDefaults (default 120s).
Value of 0 disables timeout (keep running mode).

Fixes: voquill/voquill#394

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Add setIdleTimeout method channel handler to AppDelegate.swift

**Files:**
- Modify: `mobile/ios/Runner/AppDelegate.swift`

**Step 1: Add the handler**

Add a new case after the `"setKeyboardAiConfig"` block (after line 238 `result(nil)`), before `case "startDictation"`:

```swift
      case "setIdleTimeout":
        guard let args = call.arguments as? [String: Any],
              let timeoutSeconds = args["timeoutSeconds"] as? Int,
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(Double(timeoutSeconds), forKey: DictationConstants.idleTimeoutKey)
        result(nil)
```

**Step 2: Verify**

Run: `cd mobile && grep -n "setIdleTimeout\|idleTimeout" ios/Runner/AppDelegate.swift`
Expected: The new case appears.

**Step 3: Commit**

```bash
git add mobile/ios/Runner/AppDelegate.swift
git commit -m "feat(ios): add setIdleTimeout method channel handler

Receives timeout seconds from Flutter, writes to shared UserDefaults
for DictationService to read.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Create idle timeout actions (Flutter)

**Files:**
- Create: `mobile/lib/actions/idle_timeout_actions.dart`

**Step 1: Create the actions file**

```dart
import 'package:app/utils/channel_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _logger = createNamedLogger('idle_timeout');

const _kIdleTimeoutSeconds = 'idle_timeout_seconds';
const _kIdleTimeoutKeepRunning = 'idle_timeout_keep_running';
const _defaultIdleTimeoutSeconds = 120;

Future<int> getIdleTimeoutSeconds() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getInt(_kIdleTimeoutSeconds) ?? _defaultIdleTimeoutSeconds;
}

Future<bool> getIdleTimeoutKeepRunning() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool(_kIdleTimeoutKeepRunning) ?? false;
}

Future<void> setIdleTimeout({
  required int seconds,
  required bool keepRunning,
}) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_kIdleTimeoutSeconds, seconds);
  await prefs.setBool(_kIdleTimeoutKeepRunning, keepRunning);
  await syncIdleTimeoutToNative(keepRunning ? 0 : seconds);
}

Future<void> syncIdleTimeoutToNative(int seconds) async {
  try {
    await syncIdleTimeout(timeoutSeconds: seconds);
  } catch (e) {
    _logger.w('Failed to sync idle timeout', e);
  }
}
```

**Step 2: Verify**

Run: `cd mobile && dart analyze lib/actions/idle_timeout_actions.dart`
Expected: No errors (may have warnings about unused imports until the channel util is added).

**Step 3: Commit**

```bash
git add mobile/lib/actions/idle_timeout_actions.dart
git commit -m "feat(flutter): add idle timeout actions

get/set/sync idle timeout settings via SharedPreferences and MethodChannel.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Add syncIdleTimeout to channel_utils.dart

**Files:**
- Modify: `mobile/lib/utils/channel_utils.dart`

**Step 1: Add the sync function**

Add at the end of the file (after the `syncKeyboardDictationLanguages` function):

```dart
Future<void> syncIdleTimeout({
  required int timeoutSeconds,
}) async {
  if (!_canSync) {
    return;
  }

  try {
    await _sharedChannel.invokeMethod('setIdleTimeout', {
      'timeoutSeconds': timeoutSeconds,
    });
  } catch (e) {
    _logger.w('Failed to sync idle timeout', e);
  }
}
```

**Step 2: Verify**

Run: `cd mobile && grep -n "syncIdleTimeout" lib/utils/channel_utils.dart`
Expected: The new function appears.

**Step 3: Commit**

```bash
git add mobile/lib/utils/channel_utils.dart
git commit -m "feat(flutter): add syncIdleTimeout channel utility

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Add idle timeout sync to keyboard init flow

**Files:**
- Modify: `mobile/lib/actions/keyboard_actions.dart`

**Step 1: Add import**

Add at the top of the file:

```dart
import 'package:app/actions/idle_timeout_actions.dart';
```

**Step 2: Add sync call to syncKeyboardOnInit()**

In the `syncKeyboardOnInit()` function, add after `await syncKeyboardAiSettings();` (the last line before the closing brace):

```dart
  await syncIdleTimeoutOnInit();
```

**Step 3: Add the init sync function**

Add at the end of the file:

```dart
Future<void> syncIdleTimeoutOnInit() async {
  final keepRunning = await getIdleTimeoutKeepRunning();
  final seconds = await getIdleTimeoutSeconds();
  await syncIdleTimeoutToNative(keepRunning ? 0 : seconds);
}
```

**Step 4: Verify**

Run: `cd mobile && grep -n "syncIdleTimeout\|idle_timeout" lib/actions/keyboard_actions.dart`
Expected: Import and function calls appear.

**Step 5: Commit**

```bash
git add mobile/lib/actions/keyboard_actions.dart
git commit -m "feat(flutter): sync idle timeout on keyboard init

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Create idle timeout settings sheet (Flutter UI)

**Files:**
- Create: `mobile/lib/widgets/settings/idle_timeout_sheet.dart`

**Step 1: Create the bottom sheet widget**

```dart
import 'package:app/actions/idle_timeout_actions.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class IdleTimeoutSheet extends StatefulWidget {
  const IdleTimeoutSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const IdleTimeoutSheet(),
    );
  }

  @override
  State<IdleTimeoutSheet> createState() => _IdleTimeoutSheetState();
}

class _IdleTimeoutSheetState extends State<IdleTimeoutSheet> {
  static const _presets = [60, 120, 300]; // 1m, 2m, 5m
  static const _presetLabels = ['1 min', '2 min', '5 min'];

  int _selectedSeconds = 120;
  bool _keepRunning = false;
  bool _loading = true;
  final _customController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _customController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final seconds = await getIdleTimeoutSeconds();
    final keepRunning = await getIdleTimeoutKeepRunning();
    if (mounted) {
      setState(() {
        _selectedSeconds = seconds;
        _keepRunning = keepRunning;
        if (!_presets.contains(seconds)) {
          _customController.text = (seconds / 60).round().toString();
        }
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    await setIdleTimeout(seconds: _selectedSeconds, keepRunning: _keepRunning);
    if (mounted) Navigator.pop(context);
  }

  void _selectPreset(int seconds) {
    setState(() {
      _selectedSeconds = seconds;
      _customController.clear();
    });
  }

  void _onCustomChanged(String value) {
    final minutes = int.tryParse(value);
    if (minutes != null && minutes > 0) {
      setState(() {
        _selectedSeconds = minutes * 60;
      });
    }
  }

  Future<void> _toggleKeepRunning(bool value) async {
    if (value) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Keep microphone running?'),
          content: const Text(
            'Keeping the microphone active indefinitely will drain battery '
            'and show a persistent mic indicator. Are you sure?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Enable'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    setState(() => _keepRunning = value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const SizedBox(
        height: 200,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final isCustom = !_presets.contains(_selectedSeconds) && !_keepRunning;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Padding(
          padding: Theming.padding.withTop(24).withBottom(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Idle Timeout', style: theme.textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(
                'Auto-stop dictation after inactivity to save battery',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(153),
                ),
              ),
              const SizedBox(height: 20),

              // Preset chips
              Wrap(
                spacing: 8,
                children: List.generate(_presets.length, (i) {
                  final selected =
                      _selectedSeconds == _presets[i] && !_keepRunning;
                  return ChoiceChip(
                    label: Text(_presetLabels[i]),
                    selected: selected,
                    onSelected: _keepRunning
                        ? null
                        : (_) => _selectPreset(_presets[i]),
                  );
                }),
              ),
              const SizedBox(height: 16),

              // Custom input
              TextField(
                controller: _customController,
                enabled: !_keepRunning,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Custom (minutes)',
                  hintText: 'e.g. 10',
                  border: const OutlineInputBorder(),
                  suffixText: 'min',
                  filled: _keepRunning,
                  fillColor: _keepRunning
                      ? theme.colorScheme.surfaceContainerHighest
                      : null,
                ),
                onChanged: _onCustomChanged,
              ),
              const SizedBox(height: 16),

              // Keep running toggle
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Keep running'),
                subtitle: const Text('Microphone stays active until you stop'),
                value: _keepRunning,
                onChanged: _toggleKeepRunning,
              ),
              const SizedBox(height: 16),

              // Current selection summary
              if (!_keepRunning)
                Text(
                  'Dictation will auto-stop after ${_formatDuration(_selectedSeconds)} of inactivity',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withAlpha(102),
                  ),
                ),
              if (_keepRunning)
                Text(
                  '⚠️ Microphone will stay active until you manually stop — battery drain expected',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              const SizedBox(height: 16),

              // Save button
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _save,
                  child: const Text('Save'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDuration(int seconds) {
    if (seconds < 60) return '${seconds}s';
    final minutes = seconds ~/ 60;
    final remaining = seconds % 60;
    if (remaining == 0) return '$minutes min';
    return '$minutes min ${remaining}s';
  }
}
```

**Step 2: Verify**

Run: `cd mobile && dart analyze lib/widgets/settings/idle_timeout_sheet.dart`
Expected: No errors.

**Step 3: Commit**

```bash
git add mobile/lib/widgets/settings/idle_timeout_sheet.dart
git commit -m "feat(flutter): add idle timeout settings bottom sheet

Preset chips (1m, 2m, 5m), custom minute input, and Keep Running
toggle with battery drain warning dialog.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Add idle timeout tile to settings page

**Files:**
- Modify: `mobile/lib/widgets/settings/settings_page.dart`

**Step 1: Add import**

Add after the existing imports (after line 15):

```dart
import 'package:app/widgets/settings/idle_timeout_sheet.dart';
```

**Step 2: Add the list tile**

In the "Processing" `ListTileSection`, add a new `AppListTile` after the "AI Post Processing" tile (after line 113, before the closing `]` of the children list):

```dart
                AppListTile(
                  leading: const Icon(Icons.timer_outlined),
                  title: const Text('Idle timeout'),
                  subtitle: const Text('Auto-stop mic after inactivity'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => IdleTimeoutSheet.show(context),
                ),
```

**Step 3: Verify**

Run: `cd mobile && dart analyze lib/widgets/settings/settings_page.dart`
Expected: No errors.

**Step 4: Commit**

```bash
git add mobile/lib/widgets/settings/settings_page.dart
git commit -m "feat(flutter): add idle timeout tile to settings page

Placed in Processing section alongside dictation languages and AI config.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: Build verification

**Step 1: Run Flutter analyze on the full mobile project**

Run: `cd mobile && flutter analyze`
Expected: No new errors introduced.

**Step 2: Run iOS build check (if Xcode available)**

Run: `cd mobile && flutter build ios --no-codesign --debug 2>&1 | tail -20`
Expected: Build succeeds (or only pre-existing codesign warnings).

**Step 3: Commit any fixes if needed**

---

### Task 10: Create feature branch and push for PR

**Step 1: Create a feature branch from current state**

```bash
cd /Users/chintan/Personal/repos/voquill
git checkout -b feat/ios-idle-timeout
```

Note: If commits were made on `main`, cherry-pick or reset as needed. The branch should contain only the idle timeout changes on top of the upstream `main`.

**Step 2: Push the branch**

```bash
git push origin feat/ios-idle-timeout
```

**Step 3: Create the PR against upstream**

```bash
gh pr create \
  --repo voquill/voquill \
  --base main \
  --head goyal-chintan:feat/ios-idle-timeout \
  --title "feat(ios): configurable idle timeout to stop mic after dictation" \
  --body "## Summary

Adds a configurable idle timeout that auto-stops \`DictationService\` after recording pauses. This fixes battery drain and the persistent orange mic indicator on iOS.

**Closes #394**

## Changes

### iOS Native
- **DictationConstants.swift** — Added \`idleTimeoutKey\` and \`defaultIdleTimeout\` (120s)
- **DictationService.swift** — Added \`idleTimeoutTimer\` with \`startIdleTimeout()\`/\`stopIdleTimeout()\`. Timer starts in \`pauseRecording()\`, cancels in \`resumeRecording()\`/\`stopDictation()\`. Fires \`stopDictation()\` on expiry.
- **AppDelegate.swift** — Added \`setIdleTimeout\` method channel handler

### Flutter
- **idle_timeout_actions.dart** — New file: get/set/sync idle timeout via SharedPreferences + MethodChannel
- **channel_utils.dart** — Added \`syncIdleTimeout()\` helper
- **keyboard_actions.dart** — Syncs idle timeout on keyboard init
- **idle_timeout_sheet.dart** — New settings bottom sheet with preset chips (1m, 2m, 5m), custom minute input, and \"Keep Running\" toggle with battery drain warning
- **settings_page.dart** — Added idle timeout tile to Processing section

## How it works

1. User sets timeout in Settings → Processing → Idle timeout
2. Value syncs to shared UserDefaults via MethodChannel
3. When user stops recording, \`pauseRecording()\` starts the idle timer
4. If user resumes recording before timeout, timer is cancelled
5. If timeout fires, \`stopDictation()\` tears down audio engine, session, heartbeat, and live activity
6. Setting timeout to \"Keep Running\" (value 0) disables the timer entirely (with battery warning)

## Default behavior
- **Default timeout: 2 minutes** — balances battery savings vs convenience for bursty dictation
- **Keep Running mode** requires explicit opt-in with warning dialog"
```
