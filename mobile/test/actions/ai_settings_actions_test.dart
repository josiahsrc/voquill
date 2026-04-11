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
