import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/api/dictation_api.dart';
import 'package:app/model/api_key_model.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('local transcription mode does not fall back to cloud session', () async {
    SharedPreferences.setMockInitialValues({});
    await setTranscriptionMode(AiMode.local);

    await expectLater(createDictationSession(), throwsA(isA<UnsupportedError>()));
  });
}
