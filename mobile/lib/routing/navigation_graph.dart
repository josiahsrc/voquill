import 'package:app/state/app_state.dart';
import 'package:app/store/store.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Represents a condition that must be met for a navigation rule to apply
abstract class NavigationCondition {
  const NavigationCondition();

  bool evaluate(AppState state, String currentLocation);
}

/// Represents a navigation rule with a condition and target destination
class NavigationRule {
  final NavigationCondition condition;
  final String targetRoute;

  const NavigationRule({required this.condition, required this.targetRoute});
}

/// Built-in navigation conditions
class HasErrorCondition extends NavigationCondition {
  const HasErrorCondition();

  @override
  bool evaluate(AppState state, String currentLocation) {
    return state.status.isError && currentLocation != '/error';
  }
}

class HasLoadedCondition extends NavigationCondition {
  const HasLoadedCondition();

  @override
  bool evaluate(AppState state, String currentLocation) {
    return state.status.isSuccess;
  }
}

class IsLoggedInCondition extends NavigationCondition {
  const IsLoggedInCondition();

  @override
  bool evaluate(AppState state, String currentLocation) {
    return state.isLoggedIn;
  }
}

class IsOnboardedCondition extends NavigationCondition {
  const IsOnboardedCondition();

  @override
  bool evaluate(AppState state, String currentLocation) {
    return state.isOnboarded;
  }
}

class HasPermissionsCondition extends NavigationCondition {
  const HasPermissionsCondition();

  @override
  bool evaluate(AppState state, String currentLocation) {
    return state.hasPermissions;
  }
}

class IsAtLocationCondition extends NavigationCondition {
  final String location;

  const IsAtLocationCondition(this.location);

  @override
  bool evaluate(AppState state, String currentLocation) {
    return currentLocation == location;
  }
}

class MatchesLocationRegex extends NavigationCondition {
  final RegExp regex;

  const MatchesLocationRegex(this.regex);

  @override
  bool evaluate(AppState state, String currentLocation) {
    return regex.hasMatch(currentLocation);
  }
}

class AndCondition extends NavigationCondition {
  final List<NavigationCondition> conditions;

  const AndCondition(this.conditions);

  @override
  bool evaluate(AppState state, String currentLocation) {
    return conditions.every(
      (condition) => condition.evaluate(state, currentLocation),
    );
  }
}

class OrCondition extends NavigationCondition {
  final List<NavigationCondition> conditions;

  const OrCondition(this.conditions);

  @override
  bool evaluate(AppState state, String currentLocation) {
    return conditions.any(
      (condition) => condition.evaluate(state, currentLocation),
    );
  }
}

class NotCondition extends NavigationCondition {
  final NavigationCondition condition;

  const NotCondition(this.condition);

  @override
  bool evaluate(AppState state, String currentLocation) {
    return !condition.evaluate(state, currentLocation);
  }
}

/// The navigation graph that defines all routing rules
class NavigationGraph {
  final List<NavigationRule> rules;

  const NavigationGraph(this.rules);

  /// Computes the final destination by following the navigation graph
  String? computeFinalDestination(BuildContext context, GoRouterState state) {
    final appState = getAppState();
    final currentLocation = state.matchedLocation;

    // Track visited routes to prevent infinite loops
    final visited = <String>{};
    String? destination = currentLocation;

    // Follow the navigation graph until we reach a stable destination
    while (destination != null && !visited.contains(destination)) {
      visited.add(destination);

      // Find the first rule that applies to the current destination
      final applicableRule = rules.firstWhere(
        (rule) => rule.condition.evaluate(appState, destination!),
        orElse: () => NavigationRule(
          condition: const _NeverCondition(),
          targetRoute: destination!,
        ),
      );

      // If we found a rule that redirects, follow it
      if (applicableRule.targetRoute != destination) {
        destination = applicableRule.targetRoute;
      } else {
        // No more redirects needed
        break;
      }
    }

    // Return null if we ended up at the same location (no redirect needed)
    return destination == currentLocation ? null : destination;
  }
}

/// Internal condition that never matches (used as a fallback)
class _NeverCondition extends NavigationCondition {
  const _NeverCondition();

  @override
  bool evaluate(AppState state, String currentLocation) => false;
}
