import 'package:app/model/desktop_session_model.dart';
import 'package:app/state/app_state.dart';
import 'package:app/store/store.dart';
import 'package:app/theme/build_theme.dart';
import 'package:app/widgets/remote/remote_dictation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    setAppState(
      const AppState(
        desktopSessionById: {
          'session-1': DesktopSession(
            id: 'session-1',
            name: 'Desk Mac',
            lastActive: 1,
          ),
        },
      ),
    );
  });

  testWidgets(
    'remote dictation page shows explicit local-mode message instead of air transcription UI',
    (tester) async {
      SharedPreferences.setMockInitialValues({
        'ai_transcription_mode': 'local',
      });
      await tester.binding.setSurfaceSize(const Size(430, 932));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        StoreScope(
          child: MaterialApp(
            theme: buildLightTheme(),
            home: const RemoteDictationPage(sessionId: 'session-1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Local transcription stays on device'), findsOneWidget);
      expect(
        find.text(
          'Air Transcription does not support local mode yet. Use the Voquill keyboard or switch AI Transcription to Cloud or API Key.',
        ),
        findsOneWidget,
      );
      expect(find.text('Local mode unavailable here'), findsOneWidget);
      expect(find.text('Air Transcription'), findsNothing);
      expect(find.text('Tap to dictate'), findsNothing);
    },
  );
}
