import 'package:app/widgets/settings/idle_timeout_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> pumpSheet(
    WidgetTester tester, {
    required Future<int> Function() loadSeconds,
    required Future<bool> Function() loadKeepRunning,
    required Future<void> Function({
      required int seconds,
      required bool keepRunning,
    })
    onSave,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: IdleTimeoutSheet(
            loadIdleTimeoutSeconds: loadSeconds,
            loadIdleTimeoutKeepRunning: loadKeepRunning,
            saveIdleTimeout: onSave,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('save failure resets busy state and shows an error', (tester) async {
    await pumpSheet(
      tester,
      loadSeconds: () async => 120,
      loadKeepRunning: () async => false,
      onSave: ({required seconds, required keepRunning}) async {
        throw Exception('save failed');
      },
    );

    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(
      find.text('Unable to save idle timeout. Please try again.'),
      findsOneWidget,
    );

    final saveButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Save'),
    );
    expect(saveButton.onPressed, isNotNull);
  });

  testWidgets('custom values are normalized to max bound in UI', (tester) async {
    int? savedSeconds;
    await pumpSheet(
      tester,
      loadSeconds: () async => 120,
      loadKeepRunning: () async => false,
      onSave: ({required seconds, required keepRunning}) async {
        savedSeconds = seconds;
      },
    );

    await tester.enterText(find.byType(TextField), '99');
    await tester.pumpAndSettle();

    expect(find.text('60'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(savedSeconds, 60 * 60);
  });
}
