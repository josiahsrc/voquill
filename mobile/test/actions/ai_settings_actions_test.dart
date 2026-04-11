import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/utils/channel_utils.dart' as channel_utils;
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('com.voquill.mobile/shared');

  Map<String, Object?> localModel({
    required bool downloaded,
    required bool selected,
  }) {
    return {
      'slug': 'tiny',
      'label': 'Whisper Tiny (77 MB)',
      'helper': 'Fastest, lowest accuracy',
      'sizeBytes': 77000000,
      'languageSupport': 'multilingual',
      'downloaded': downloaded,
      'valid': downloaded,
      'selected': selected,
    };
  }

  tearDown(() {
    channel_utils.debugSetCanSyncOverride(null);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('transcription mode round-trips local', () async {
    SharedPreferences.setMockInitialValues({});

    await setTranscriptionMode(AiMode.local);

    expect(await getTranscriptionMode(), AiMode.local);
  });

  test('post-processing mode rejects local', () async {
    SharedPreferences.setMockInitialValues({
      'ai_post_processing_mode': AiMode.cloud.name,
    });

    await expectLater(
      setPostProcessingMode(AiMode.local),
      throwsArgumentError,
    );
    expect(await getPostProcessingMode(), AiMode.cloud);
  });

  test(
    'post-processing mode preserves persisted local as explicit invalid state',
    () async {
      SharedPreferences.setMockInitialValues({
        'ai_post_processing_mode': AiMode.local.name,
      });

      expect(await getPostProcessingMode(), AiMode.local);
    },
  );

  test('post-processing sync mode coerces local to cloud', () {
    expect(postProcessingModeForSync(AiMode.local), AiMode.cloud);
    expect(postProcessingModeForSync(AiMode.api), AiMode.api);
    expect(postProcessingModeForSync(AiMode.cloud), AiMode.cloud);
  });

  test('local sync clears transcription model when no local model is selected', () {
    expect(
      shouldClearTranscriptionModelForSync(
        transcriptionMode: AiMode.local,
        transcriptionModel: null,
      ),
      isTrue,
    );
  });

  test('local sync keeps transcription model when a local model is selected', () {
    expect(
      shouldClearTranscriptionModelForSync(
        transcriptionMode: AiMode.local,
        transcriptionModel: 'tiny',
      ),
      isFalse,
    );
  });

  test(
    'syncKeyboardAiSettings sends explicit clear when local mode has no selected model',
    () async {
      channel_utils.debugSetCanSyncOverride(true);
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': AiMode.local.name,
        'ai_post_processing_mode': AiMode.cloud.name,
      });

      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call);
            if (call.method == 'listLocalTranscriptionModels') {
              return [
                {
                  'slug': 'tiny',
                  'label': 'Whisper Tiny (77 MB)',
                  'helper': 'Fastest, lowest accuracy',
                  'sizeBytes': 77000000,
                  'languageSupport': 'multilingual',
                  'downloaded': true,
                  'valid': true,
                  'selected': false,
                },
              ];
            }
            return null;
          });

      await syncKeyboardAiSettings();

      expect(calls.map((call) => call.method), [
        'listLocalTranscriptionModels',
        'setKeyboardAiConfig',
      ]);
      final args = calls.last.arguments as Map;
      expect(args['transcriptionMode'], AiMode.local.name);
      expect(args['clearTranscriptionModel'], 'true');
      expect(args.containsKey('transcriptionModel'), isFalse);
    },
  );

  test(
    'selectLocalTranscriptionModel persists local mode before syncing keyboard config',
    () async {
      channel_utils.debugSetCanSyncOverride(true);
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': AiMode.cloud.name,
        'ai_post_processing_mode': AiMode.cloud.name,
      });

      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call);
            if (call.method == 'listLocalTranscriptionModels') {
              return [localModel(downloaded: true, selected: true)];
            }
            return null;
          });

      await selectLocalTranscriptionModel('tiny');

      expect(await getTranscriptionMode(), AiMode.local);
      expect(calls.map((call) => call.method), [
        'selectLocalTranscriptionModel',
        'listLocalTranscriptionModels',
        'setKeyboardAiConfig',
      ]);
      final args = calls.last.arguments as Map;
      expect(args['transcriptionMode'], AiMode.local.name);
      expect(args['transcriptionModel'], 'tiny');
      expect(args.containsKey('clearTranscriptionModel'), isFalse);
    },
  );

  test(
    'deleteLocalTranscriptionModel repairs stale cloud prefs after deleting native local selection',
    () async {
      channel_utils.debugSetCanSyncOverride(true);
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': AiMode.cloud.name,
        'ai_post_processing_mode': AiMode.cloud.name,
      });

      final calls = <MethodCall>[];
      var downloaded = true;
      var selected = true;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call);
            if (call.method == 'listLocalTranscriptionModels') {
              return [localModel(downloaded: downloaded, selected: selected)];
            }
            if (call.method == 'deleteLocalTranscriptionModel') {
              downloaded = false;
              selected = false;
            }
            return null;
          });

      await deleteLocalTranscriptionModel('tiny');

      expect(await getTranscriptionMode(), AiMode.local);
      expect(calls.map((call) => call.method), [
        'listLocalTranscriptionModels',
        'deleteLocalTranscriptionModel',
        'listLocalTranscriptionModels',
        'setKeyboardAiConfig',
      ]);
      final args = calls.last.arguments as Map;
      expect(args['transcriptionMode'], AiMode.local.name);
      expect(args['clearTranscriptionModel'], 'true');
      expect(args.containsKey('transcriptionModel'), isFalse);
    },
  );
}
