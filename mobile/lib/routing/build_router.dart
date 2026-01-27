import 'package:app/routing/guard_redirect.dart';
import 'package:app/widgets/dashboard/dashboard_page.dart';
import 'package:app/widgets/error/error_page.dart';
import 'package:app/widgets/error/not_found_page.dart';
import 'package:app/widgets/onboarding/onboarding_page.dart';
import 'package:app/widgets/splash/splash_page.dart';
import 'package:app/widgets/welcome/welcome_page.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

final _rootKey = GlobalKey<NavigatorState>();

GoRouter buildRouter({required Listenable? refreshListenable}) {
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/',
    debugLogDiagnostics: false,
    redirect: (context, state) => guardRedirect(context, state),
    refreshListenable: refreshListenable,
    errorBuilder: (context, state) => const NotFoundPage(),
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashPage(),
        name: 'splash',
      ),
      GoRoute(
        path: '/error',
        builder: (context, state) => const ErrorPage(),
        name: 'error',
      ),
      GoRoute(
        path: '/welcome',
        builder: (context, state) => const WelcomePage(),
        name: 'welcome',
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingPage(),
        name: 'onboarding',
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardPage(),
        name: 'dashboard',
      ),
    ],
  );
}
