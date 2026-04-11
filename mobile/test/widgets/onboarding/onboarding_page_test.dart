import 'package:app/state/app_state.dart';
import 'package:app/store/store.dart';
import 'package:app/theme/build_theme.dart';
import 'package:app/widgets/onboarding/onboarding_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    setAppState(const AppState());
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('onboarding page renders its first step on the first frame', (
    tester,
  ) async {
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const OnboardingPage(),
        ),
      ],
    );

    await tester.pumpWidget(
      StoreScope(
        child: MaterialApp.router(
          theme: buildLightTheme(),
          routerConfig: router,
        ),
      ),
    );

    expect(find.text('Create your account'), findsOneWidget);
  });
}
