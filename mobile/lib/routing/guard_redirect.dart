import 'package:app/routing/navigation_graph.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

final _graph = NavigationGraph([
  // Error handling - highest priority
  NavigationRule(condition: HasErrorCondition(), targetRoute: '/error'),

  // Splash screen logic
  NavigationRule(
    condition: AndCondition([IsAtLocationCondition('/'), HasLoadedCondition()]),
    targetRoute: '/home',
  ),
]);

String? guardRedirect(BuildContext context, GoRouterState state) {
  final result = _graph.computeFinalDestination(context, state);
  if (kDebugMode) {
    print('Guard redirect: ${state.matchedLocation} -> $result');
  }
  return result;
}
