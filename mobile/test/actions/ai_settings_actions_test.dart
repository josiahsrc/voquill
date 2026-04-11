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
}
