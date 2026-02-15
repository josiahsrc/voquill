import 'package:app/routing/navigation_graph.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

final _graph = NavigationGraph([
  // Error handling - highest priority
  NavigationRule(condition: HasErrorCondition(), targetRoute: '/error'),

  // Splash screen -> welcome when loaded
  NavigationRule(
    condition: AndCondition([IsAtLocationCondition('/'), HasLoadedCondition()]),
    targetRoute: '/welcome',
  ),

  // Welcome page guards (matching desktop Guard.tsx)
  // If onboarded -> dashboard
  NavigationRule(
    condition: AndCondition([
      IsAtLocationCondition('/welcome'),
      IsOnboardedCondition(),
    ]),
    targetRoute: '/dashboard',
  ),
  // If logged in but not onboarded -> onboarding
  NavigationRule(
    condition: AndCondition([
      IsAtLocationCondition('/welcome'),
      IsLoggedInCondition(),
      NotCondition(IsOnboardedCondition()),
    ]),
    targetRoute: '/onboarding',
  ),

  // Login page guards (same as welcome)
  NavigationRule(
    condition: AndCondition([
      IsAtLocationCondition('/login'),
      IsOnboardedCondition(),
    ]),
    targetRoute: '/dashboard',
  ),
  NavigationRule(
    condition: AndCondition([
      IsAtLocationCondition('/login'),
      IsLoggedInCondition(),
      NotCondition(IsOnboardedCondition()),
    ]),
    targetRoute: '/onboarding',
  ),

  // Onboarding page guards
  // If onboarded -> dashboard
  NavigationRule(
    condition: AndCondition([
      IsAtLocationCondition('/onboarding'),
      IsOnboardedCondition(),
    ]),
    targetRoute: '/dashboard',
  ),

  // Dictate page: only allow if logged in, otherwise -> welcome
  NavigationRule(
    condition: AndCondition([
      IsAtLocationCondition('/dictate'),
      NotCondition(IsLoggedInCondition()),
    ]),
    targetRoute: '/welcome',
  ),

  // Dashboard page guards
  // If not onboarded -> welcome
  NavigationRule(
    condition: AndCondition([
      MatchesLocationRegex(RegExp(r'^/dashboard')),
      NotCondition(IsOnboardedCondition()),
    ]),
    targetRoute: '/welcome',
  ),
]);

String _resolvedLocation = '/';

String? guardRedirect(BuildContext context, GoRouterState state) {
  final result = _graph.computeFinalDestination(context, state);
  if (kDebugMode) {
    print('Guard redirect: ${state.matchedLocation} -> $result');
  }
  if (result != null) {
    if (result == _resolvedLocation) return null;
    _resolvedLocation = result;
  } else {
    _resolvedLocation = state.matchedLocation;
  }
  return result;
}
