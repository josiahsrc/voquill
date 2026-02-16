import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_video_looper/flutter_video_looper.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('FlutterVideoLooper renders', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: FlutterVideoLooper.asset(
            path: 'assets/videos/sample.mp4',
          ),
        ),
      ),
    );

    expect(find.byType(FlutterVideoLooper), findsOneWidget);
  });
}
