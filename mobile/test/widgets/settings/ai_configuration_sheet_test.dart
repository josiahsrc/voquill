import 'package:app/widgets/settings/ai_configuration_sheet.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/widgets/settings/api_key_list_widget.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('transcription settings expose a distinct local mode panel', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'ai_transcription_mode': AiMode.local.name,
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AiConfigurationSheet(
            configContext: AiConfigContext.transcription,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Local'), findsOneWidget);
    expect(find.text('On-device transcription'), findsOneWidget);
    expect(find.byType(ApiKeyListWidget), findsNothing);
  });

  testWidgets('post-processing settings keep cloud and api key modes only', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AiConfigurationSheet(
            configContext: AiConfigContext.postProcessing,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Cloud'), findsOneWidget);
    expect(find.text('API Key'), findsOneWidget);
    expect(find.text('Local'), findsNothing);
  });

  testWidgets('post-processing settings show invalid local state explicitly', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'ai_post_processing_mode': AiMode.local.name,
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AiConfigurationSheet(
            configContext: AiConfigContext.postProcessing,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Local post-processing is unavailable'), findsOneWidget);
    expect(find.text('Choose Cloud or API Key to continue.'), findsOneWidget);
    expect(find.byType(ApiKeyListWidget), findsNothing);
  });
}
