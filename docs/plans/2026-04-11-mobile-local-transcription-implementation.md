# Mobile Local/On-Device Transcription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a first-class mobile `Local` transcription mode so iOS and Android users can download on-device models, select the active model, and transcribe without depending on cloud or API transcription.

**Architecture:** Keep product behavior aligned with macOS, but implement the runtime natively per platform. The Flutter mobile app owns local-model management and mode selection; iOS and Android native layers persist shared local-model state, and the keyboard/IME reads that state to route transcription through a new local repo instead of the current cloud/API fallback.

**Tech Stack:** Flutter, SharedPreferences, platform channels, Swift, Kotlin, iOS App Groups, Android SharedPreferences/files, embedded Whisper/ggml runtime, flutter_test, XCTest, Gradle unit tests

---

## Read this first

Before changing code, read these files for parity requirements and existing patterns:

- `docs/plans/2026-04-11-mobile-local-transcription-design.md`
- `docs/local-model-integration.md`
- `apps/desktop/src/components/settings/AITranscriptionConfiguration.tsx`
- `apps/desktop/src/utils/local-transcription.utils.ts`
- `packages/rust_transcription/src/models.rs`
- `mobile/lib/widgets/settings/ai_configuration_sheet.dart`
- `mobile/lib/actions/ai_settings_actions.dart`
- `mobile/lib/utils/channel_utils.dart`
- `mobile/ios/Runner/AppDelegate.swift`
- `mobile/ios/keyboard/KeyboardViewController.swift`
- `mobile/android/app/src/main/kotlin/com/voquill/mobile/MainActivity.kt`
- `mobile/android/app/src/main/kotlin/com/voquill/mobile/VoquillIME.kt`

## Guardrails

- Do **not** change post-processing behavior in this feature.
- Do **not** silently fall back from `local` to `cloud` or `api`.
- Reuse the desktop model slugs: `tiny`, `base`, `small`, `medium`, `turbo`, `large`.
- Mirror download URLs and filenames from `packages/rust_transcription/src/models.rs`.
- Keep the model chooser behavior aligned with macOS even if the UI layout differs on mobile.
- Commit after every task.

### Task 1: Add local transcription mode to the Flutter settings domain

**Files:**
- Create: `mobile/lib/model/local_transcription_model.dart`
- Modify: `mobile/lib/model/api_key_model.dart`
- Modify: `mobile/lib/actions/ai_settings_actions.dart`
- Test: `mobile/test/actions/ai_settings_actions_test.dart`

**Step 1: Write the failing test**

```dart
import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/model/api_key_model.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('transcription mode round-trips local', () async {
    SharedPreferences.setMockInitialValues({});

    await setTranscriptionMode(AiMode.local);

    expect(await getTranscriptionMode(), AiMode.local);
  });
}
```

**Step 2: Run test to verify it fails**

Run: `cd mobile && flutter test test/actions/ai_settings_actions_test.dart -r expanded`

Expected: FAIL because `AiMode.local` does not exist and `getTranscriptionMode()` only returns `cloud` or `api`.

**Step 3: Write minimal implementation**

```dart
enum AiMode {
  cloud,
  api,
  local;
}

Future<AiMode> getTranscriptionMode() async {
  final prefs = await SharedPreferences.getInstance();
  final value = prefs.getString(_kTranscriptionMode);
  if (value == AiMode.api.name) return AiMode.api;
  if (value == AiMode.local.name) return AiMode.local;
  return AiMode.cloud;
}
```

Also add a `LocalTranscriptionModel` Dart type that can represent:

- `slug`
- `label`
- `helper`
- `sizeBytes`
- `languageSupport`
- `downloaded`
- `valid`
- `selected`
- `downloadProgress`
- `validationError`

Keep this model focused on what the settings sheet needs to render.

**Step 4: Run test to verify it passes**

Run: `cd mobile && flutter test test/actions/ai_settings_actions_test.dart -r expanded`

Expected: PASS

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/lib/model/local_transcription_model.dart mobile/lib/model/api_key_model.dart mobile/lib/actions/ai_settings_actions.dart mobile/test/actions/ai_settings_actions_test.dart
git commit -m "feat(mobile): add local transcription settings state"
```

### Task 2: Add a Flutter/native bridge for local-model management

**Files:**
- Modify: `mobile/lib/utils/channel_utils.dart`
- Modify: `mobile/lib/actions/ai_settings_actions.dart`
- Modify: `mobile/ios/Runner/AppDelegate.swift`
- Modify: `mobile/android/app/src/main/kotlin/com/voquill/mobile/MainActivity.kt`
- Test: `mobile/test/utils/channel_utils_test.dart`
- Test: `mobile/ios/RunnerTests/SharedAiConfigTests.swift`
- Test: `mobile/android/app/src/test/kotlin/com/voquill/mobile/MainActivityLocalModelBridgeTest.kt`

**Step 1: Write the failing tests**

Write one Dart test that asserts the method channel sends the new local-model methods and one native test per platform that asserts the platform handler reads/writes the expected keys.

```dart
test('syncKeyboardAiConfig includes local mode payload', () async {
  final calls = <MethodCall>[];
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(const MethodChannel('app/shared'), (call) async {
    calls.add(call);
    return null;
  });

  await syncKeyboardAiConfig(
    transcriptionMode: 'local',
    postProcessingMode: 'cloud',
    transcriptionModel: 'tiny',
  );

  expect(calls.single.method, 'setKeyboardAiConfig');
  expect(calls.single.arguments['transcriptionMode'], 'local');
  expect(calls.single.arguments['transcriptionModel'], 'tiny');
});
```

**Step 2: Run tests to verify they fail**

Run:

- `cd mobile && flutter test test/utils/channel_utils_test.dart -r expanded`
- `cd mobile/ios && xcodebuild test -project Runner.xcodeproj -scheme Runner -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:RunnerTests/SharedAiConfigTests`
- `cd mobile/android && ./gradlew app:testDevDebugUnitTest --tests com.voquill.mobile.MainActivityLocalModelBridgeTest`

Expected: FAIL because the bridge does not expose any local-model methods or tests yet.

**Step 3: Write minimal implementation**

Add these platform-channel operations and keep the payloads small and explicit:

```dart
Future<List<LocalTranscriptionModel>> listLocalTranscriptionModels();
Future<void> downloadLocalTranscriptionModel(String slug);
Future<void> deleteLocalTranscriptionModel(String slug);
Future<void> selectLocalTranscriptionModel(String slug);
```

On native sides:

- persist `voquill_ai_transcription_mode = local`
- persist `voquill_ai_transcription_model = <slug>`
- expose a method that returns model status records for all supported local models
- expose download/delete/select methods used by the Flutter settings sheet

Do **not** pack API-key fields into these model-management calls.

**Step 4: Run tests to verify they pass**

Run the same three commands from Step 2.

Expected: PASS

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/lib/utils/channel_utils.dart mobile/lib/actions/ai_settings_actions.dart mobile/test/utils/channel_utils_test.dart mobile/ios/Runner/AppDelegate.swift mobile/ios/RunnerTests/SharedAiConfigTests.swift mobile/android/app/src/main/kotlin/com/voquill/mobile/MainActivity.kt mobile/android/app/src/test/kotlin/com/voquill/mobile/MainActivityLocalModelBridgeTest.kt
git commit -m "feat(mobile): add local model bridge methods"
```

### Task 3: Build the Flutter local-model chooser in the AI settings sheet

**Files:**
- Modify: `mobile/lib/widgets/settings/ai_configuration_sheet.dart`
- Create: `mobile/lib/widgets/settings/local_transcription_model_list.dart`
- Modify: `mobile/lib/actions/ai_settings_actions.dart`
- Test: `mobile/test/widgets/settings/ai_configuration_sheet_test.dart`

**Step 1: Write the failing widget test**

```dart
testWidgets('transcription sheet shows Local mode and a model list', (tester) async {
  await tester.pumpWidget(
    const MaterialApp(
      home: Scaffold(
        body: AiConfigurationSheet(configContext: AiConfigContext.transcription),
      ),
    ),
  );

  expect(find.text('Local'), findsOneWidget);
  expect(find.textContaining('Whisper'), findsWidgets);
  expect(find.text('Download'), findsWidgets);
});
```

**Step 2: Run test to verify it fails**

Run: `cd mobile && flutter test test/widgets/settings/ai_configuration_sheet_test.dart -r expanded`

Expected: FAIL because the segmented control only renders `Cloud` and `API Key`.

**Step 3: Write minimal implementation**

Update the transcription settings sheet so that:

- `AiConfigContext.transcription` shows `Cloud`, `API Key`, and `Local`
- `AiConfigContext.postProcessing` still shows only `Cloud` and `API Key`
- selecting `Local` loads model statuses from the native bridge
- the list renders model label, helper text, size, language support, validation state, and download/delete/select actions
- the currently selected local model is obvious without extra taps

Start with a dedicated widget:

```dart
class LocalTranscriptionModelList extends StatelessWidget {
  final List<LocalTranscriptionModel> models;
  final Future<void> Function(String slug) onDownload;
  final Future<void> Function(String slug) onDelete;
  final Future<void> Function(String slug) onSelect;
}
```

Mirror the desktop chooser behavior before polishing layout details.

**Step 4: Run test to verify it passes**

Run: `cd mobile && flutter test test/widgets/settings/ai_configuration_sheet_test.dart -r expanded`

Expected: PASS

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/lib/widgets/settings/ai_configuration_sheet.dart mobile/lib/widgets/settings/local_transcription_model_list.dart mobile/lib/actions/ai_settings_actions.dart mobile/test/widgets/settings/ai_configuration_sheet_test.dart
git commit -m "feat(mobile): add local model chooser UI"
```

### Task 4: Implement the iOS host-app local-model catalog and downloader

**Files:**
- Create: `mobile/ios/Runner/LocalTranscriptionModelManager.swift`
- Modify: `mobile/ios/Runner/AppDelegate.swift`
- Modify: `mobile/ios/Runner/DictationConstants.swift`
- Modify: `mobile/ios/Podfile`
- Test: `mobile/ios/RunnerTests/LocalTranscriptionModelManagerTests.swift`

**Step 1: Write the failing XCTest**

```swift
func test_listModels_marks_downloaded_model_as_selected_and_valid() throws {
    let manager = LocalTranscriptionModelManager(
        fileManager: .default,
        appGroupId: AppDelegate.appGroupId
    )

    try manager.saveManifest([
        .init(slug: "tiny", selected: true, downloaded: true, valid: true)
    ])

    let models = try manager.listModels()
    XCTAssertEqual(models.first?.slug, "tiny")
    XCTAssertEqual(models.first?.selected, true)
    XCTAssertEqual(models.first?.downloaded, true)
    XCTAssertEqual(models.first?.valid, true)
}
```

**Step 2: Run test to verify it fails**

Run: `cd mobile/ios && xcodebuild test -project Runner.xcodeproj -scheme Runner -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:RunnerTests/LocalTranscriptionModelManagerTests`

Expected: FAIL because `LocalTranscriptionModelManager` and the manifest helpers do not exist.

**Step 3: Write minimal implementation**

Create `LocalTranscriptionModelManager.swift` that owns:

- the supported model catalog and user-facing metadata
- App Group paths for `models/` and a manifest JSON file
- download URLs/filenames matching `packages/rust_transcription/src/models.rs`
- list/download/delete/select/validate operations

Start with a manifest shape like:

```swift
struct LocalModelRecord: Codable {
    let slug: String
    let filename: String
    let sizeBytes: Int64
    let languageSupport: String
    var downloaded: Bool
    var valid: Bool
    var selected: Bool
    var validationError: String?
}
```

Keep downloads app-owned. The keyboard extension should only consume validated artifacts from the App Group container.

**Step 4: Run test to verify it passes**

Run the same xcodebuild command from Step 2.

Expected: PASS

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/ios/Runner/LocalTranscriptionModelManager.swift mobile/ios/Runner/AppDelegate.swift mobile/ios/Runner/DictationConstants.swift mobile/ios/Podfile mobile/ios/RunnerTests/LocalTranscriptionModelManagerTests.swift
git commit -m "feat(ios): add local model manager"
```

### Task 5: Wire iOS keyboard transcription to a real local repo

**Files:**
- Create: `mobile/ios/keyboard/Repos/LocalTranscribeAudioRepo.swift`
- Create: `mobile/ios/keyboard/Repos/TranscriptionBackendResolver.swift`
- Modify: `mobile/ios/keyboard/KeyboardViewController.swift`
- Modify: `mobile/ios/keyboard/Repos/TranscribeAudioRepo.swift`
- Test: `mobile/ios/RunnerTests/TranscriptionBackendResolverTests.swift`

**Step 1: Write the failing XCTest**

```swift
func test_resolver_uses_local_repo_when_mode_is_local_and_model_is_valid() throws {
    let resolver = TranscriptionBackendResolver()
    let result = try resolver.resolve(
        transcriptionMode: "local",
        selectedModel: "tiny",
        hasCloudConfig: false,
        hasApiConfig: false,
        localModelValid: true
    )

    XCTAssertEqual(result, .local(model: "tiny"))
}
```

**Step 2: Run test to verify it fails**

Run: `cd mobile/ios && xcodebuild test -project Runner.xcodeproj -scheme Runner -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:RunnerTests/TranscriptionBackendResolverTests`

Expected: FAIL because the resolver and local repo path do not exist.

**Step 3: Write minimal implementation**

Extract the mode-selection logic out of `KeyboardViewController` so it becomes testable and explicit:

```swift
enum TranscriptionBackend {
    case cloud
    case api
    case local(model: String)
}
```

Then:

- build `LocalTranscribeAudioRepo` around the embedded iOS local runtime
- read the selected local model from the App Group manifest/shared defaults
- return a hard failure if local mode is selected but the model is missing or invalid
- update `KeyboardViewController.buildTranscribeRepo(...)` to use the resolver instead of the current `api`-else-cloud shortcut

Do not call cloud when `local` is selected.

**Step 4: Run test to verify it passes**

Run the same xcodebuild command from Step 2, then compile the app target:

- `cd mobile/ios && xcodebuild test -project Runner.xcodeproj -scheme Runner -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:RunnerTests/TranscriptionBackendResolverTests`
- `cd mobile && flutter build ios --debug --simulator --flavor dev -t lib/main_dev.dart`

Expected: TEST PASS and successful iOS build

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/ios/keyboard/Repos/LocalTranscribeAudioRepo.swift mobile/ios/keyboard/Repos/TranscriptionBackendResolver.swift mobile/ios/keyboard/KeyboardViewController.swift mobile/ios/keyboard/Repos/TranscribeAudioRepo.swift mobile/ios/RunnerTests/TranscriptionBackendResolverTests.swift
git commit -m "feat(ios): add local keyboard transcription"
```

### Task 6: Implement the Android host-app local-model catalog and downloader

**Files:**
- Create: `mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/LocalTranscriptionModelManager.kt`
- Modify: `mobile/android/app/src/main/kotlin/com/voquill/mobile/MainActivity.kt`
- Modify: `mobile/android/app/build.gradle.kts`
- Test: `mobile/android/app/src/test/kotlin/com/voquill/mobile/repos/LocalTranscriptionModelManagerTest.kt`

**Step 1: Write the failing unit test**

```kotlin
@Test
fun listModels_marks_selected_model_as_downloaded_and_valid() {
    val manager = LocalTranscriptionModelManager(context)
    manager.saveManifest(
        listOf(LocalModelRecord(slug = "tiny", selected = true, downloaded = true, valid = true))
    )

    val models = manager.listModels()

    assertEquals("tiny", models.first().slug)
    assertTrue(models.first().selected)
    assertTrue(models.first().downloaded)
    assertTrue(models.first().valid)
}
```

**Step 2: Run test to verify it fails**

Run: `cd mobile/android && ./gradlew app:testDevDebugUnitTest --tests com.voquill.mobile.repos.LocalTranscriptionModelManagerTest`

Expected: FAIL because the manager and manifest helpers do not exist.

**Step 3: Write minimal implementation**

Create `LocalTranscriptionModelManager.kt` with the same responsibilities as iOS:

- supported local model catalog
- app-private `models/` directory
- manifest file with selected/downloaded/valid state
- download/delete/select/validate operations
- model metadata aligned with desktop labels and slugs

Use a small record like:

```kotlin
data class LocalModelRecord(
    val slug: String,
    val filename: String,
    val sizeBytes: Long,
    val languageSupport: String,
    val downloaded: Boolean,
    val valid: Boolean,
    val selected: Boolean,
    val validationError: String? = null,
)
```

Keep the download manager in the host app layer, not the IME.

**Step 4: Run test to verify it passes**

Run the same Gradle command from Step 2.

Expected: PASS

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/LocalTranscriptionModelManager.kt mobile/android/app/src/main/kotlin/com/voquill/mobile/MainActivity.kt mobile/android/app/build.gradle.kts mobile/android/app/src/test/kotlin/com/voquill/mobile/repos/LocalTranscriptionModelManagerTest.kt
git commit -m "feat(android): add local model manager"
```

### Task 7: Wire Android IME transcription to a real local repo

**Files:**
- Create: `mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/LocalTranscribeAudioRepo.kt`
- Create: `mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/TranscriptionBackendResolver.kt`
- Modify: `mobile/android/app/src/main/kotlin/com/voquill/mobile/VoquillIME.kt`
- Modify: `mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/TranscribeAudioRepo.kt`
- Test: `mobile/android/app/src/test/kotlin/com/voquill/mobile/repos/TranscriptionBackendResolverTest.kt`

**Step 1: Write the failing unit test**

```kotlin
@Test
fun resolve_returns_local_backend_when_mode_is_local_and_model_is_valid() {
    val result = TranscriptionBackendResolver.resolve(
        transcriptionMode = "local",
        selectedModel = "tiny",
        hasApiKey = false,
        hasCloudConfig = false,
        localModelValid = true,
    )

    assertEquals(TranscriptionBackend.Local("tiny"), result)
}
```

**Step 2: Run test to verify it fails**

Run: `cd mobile/android && ./gradlew app:testDevDebugUnitTest --tests com.voquill.mobile.repos.TranscriptionBackendResolverTest`

Expected: FAIL because the resolver and local repo path do not exist.

**Step 3: Write minimal implementation**

Mirror the iOS backend-selection logic:

```kotlin
sealed interface TranscriptionBackend {
    data object Cloud : TranscriptionBackend
    data object Api : TranscriptionBackend
    data class Local(val model: String) : TranscriptionBackend
}
```

Then:

- build `LocalTranscribeAudioRepo.kt` around the embedded Android local runtime
- resolve `local` explicitly in `VoquillIME.buildTranscribeRepo(...)`
- load the selected local model from shared prefs/manifest
- fail loudly when local is selected but no valid local model exists

Do not keep the current `api`-else-cloud behavior once `local` exists.

**Step 4: Run test to verify it passes**

Run:

- `cd mobile/android && ./gradlew app:testDevDebugUnitTest --tests com.voquill.mobile.repos.TranscriptionBackendResolverTest`
- `cd mobile/android && ./gradlew app:assembleDevDebug`

Expected: TEST PASS and `BUILD SUCCESSFUL`

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/LocalTranscribeAudioRepo.kt mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/TranscriptionBackendResolver.kt mobile/android/app/src/main/kotlin/com/voquill/mobile/VoquillIME.kt mobile/android/app/src/main/kotlin/com/voquill/mobile/repos/TranscribeAudioRepo.kt mobile/android/app/src/test/kotlin/com/voquill/mobile/repos/TranscriptionBackendResolverTest.kt
git commit -m "feat(android): add local ime transcription"
```

### Task 8: Audit every mobile transcription entry point and remove silent fallbacks

**Files:**
- Modify: `mobile/lib/api/dictation_api.dart`
- Modify: `mobile/lib/widgets/remote/remote_dictation_page.dart`
- Modify: `mobile/lib/widgets/settings/settings_page.dart`
- Test: `mobile/test/api/dictation_api_test.dart`
- Test: `mobile/test/widgets/remote/remote_dictation_page_test.dart`

**Step 1: Write the failing tests**

Write one test that proves `createDictationSession()` does not fall through to cloud when `AiMode.local` is selected and one widget test that shows an explicit unsupported or local-ready state in the remote dictation page.

```dart
test('createDictationSession does not fall back to cloud when local is selected', () async {
  SharedPreferences.setMockInitialValues({'ai_transcription_mode': 'local'});

  expect(
    () => createDictationSession(),
    throwsA(isA<UnsupportedError>()),
  );
});
```

**Step 2: Run test to verify it fails**

Run:

- `cd mobile && flutter test test/api/dictation_api_test.dart -r expanded`
- `cd mobile && flutter test test/widgets/remote/remote_dictation_page_test.dart -r expanded`

Expected: FAIL because local mode currently falls through to cloud behavior.

**Step 3: Write minimal implementation**

Make every mobile transcription surface explicit:

- if a surface is ready for local mode now, route it to a `LocalDictationSession`
- if a surface is not in scope for this issue, throw/show a clear local-mode message instead of falling back to cloud

At minimum, `createDictationSession()` must stop doing this:

```dart
if (mode == AiMode.api) {
  ...
}
return CloudDictationSession();
```

Replace it with explicit branching:

```dart
if (mode == AiMode.local) {
  throw UnsupportedError('Local mode is not wired for this surface yet.');
}
if (mode == AiMode.api) {
  ...
}
return CloudDictationSession();
```

If you can wire a real `LocalDictationSession` without broadening risk, do that instead and update the tests accordingly.

**Step 4: Run test to verify it passes**

Run the same two Flutter test commands from Step 2.

Expected: PASS

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile/lib/api/dictation_api.dart mobile/lib/widgets/remote/remote_dictation_page.dart mobile/lib/widgets/settings/settings_page.dart mobile/test/api/dictation_api_test.dart mobile/test/widgets/remote/remote_dictation_page_test.dart
git commit -m "fix(mobile): make local transcription routing explicit"
```

### Task 9: Run the full verification pass and update docs if copy changed

**Files:**
- Modify if needed: `apps/docs/src/content/docs/guides/transcription.md`
- Modify if needed: `apps/docs/src/content/docs/getting-started/introduction.md`

**Step 1: Add any missing final assertions**

Before running the full suite, make sure the tests cover:

- Local mode round-trips through Flutter settings
- model chooser renders download/delete/select states
- iOS and Android native managers return consistent model slugs
- keyboard/IME repo resolution fails loudly when local is invalid
- no silent cloud/API fallback remains

**Step 2: Run the project tests**

Run:

- `cd mobile && flutter test -r expanded`
- `cd mobile/android && ./gradlew app:testDevDebugUnitTest`
- `cd mobile/ios && xcodebuild test -project Runner.xcodeproj -scheme Runner -destination 'platform=iOS Simulator,name=iPhone 16'`

Expected: PASS / `BUILD SUCCESSFUL`

**Step 3: Run platform builds**

Run:

- `cd mobile/android && ./gradlew app:assembleDevDebug`
- `cd mobile && flutter build ios --debug --simulator --flavor dev -t lib/main_dev.dart`

Expected: `BUILD SUCCESSFUL` / successful Flutter iOS build

**Step 4: Update user-facing docs if wording changed**

If the mobile UI copy or setup flow now references downloadable local models, update the docs pages named above so the product language remains accurate.

**Step 5: Commit**

```bash
cd <repo-root>
git add mobile apps/docs/src/content/docs/guides/transcription.md apps/docs/src/content/docs/getting-started/introduction.md
git commit -m "test(mobile): verify local transcription end to end"
```
