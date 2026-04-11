import 'package:app/model/local_transcription_model.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('com.voquill.mobile/shared');

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('syncKeyboardAiConfig includes local mode payload', () async {
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });

    await syncKeyboardAiConfig(
      transcriptionMode: 'local',
      postProcessingMode: 'cloud',
      transcriptionModel: 'tiny',
    );

    expect(calls.single.method, 'setKeyboardAiConfig');
    expect((calls.single.arguments as Map)['transcriptionMode'], 'local');
    expect((calls.single.arguments as Map)['transcriptionModel'], 'tiny');
  });

  test('local transcription model bridge uses expected channel methods', () async {
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
                'selected': true,
              },
            ];
          }
          return null;
        });

    final models = await listLocalTranscriptionModels();
    await downloadLocalTranscriptionModel('tiny');
    await deleteLocalTranscriptionModel('tiny');
    await selectLocalTranscriptionModel('tiny');

    expect(
      models,
      const [
        LocalTranscriptionModel(
          slug: 'tiny',
          label: 'Whisper Tiny (77 MB)',
          helper: 'Fastest, lowest accuracy',
          sizeBytes: 77000000,
          languageSupport: LocalTranscriptionLanguageSupport.multilingual,
          downloaded: true,
          valid: true,
          selected: true,
        ),
      ],
    );
    expect(
      calls.map((call) => call.method).toList(),
      [
        'listLocalTranscriptionModels',
        'downloadLocalTranscriptionModel',
        'deleteLocalTranscriptionModel',
        'selectLocalTranscriptionModel',
      ],
    );
    expect((calls[1].arguments as Map)['slug'], 'tiny');
    expect((calls[2].arguments as Map)['slug'], 'tiny');
    expect((calls[3].arguments as Map)['slug'], 'tiny');
  });
}
