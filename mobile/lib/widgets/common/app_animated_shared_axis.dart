import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

class AppAnimatedSharedAxis extends StatelessWidget {
  const AppAnimatedSharedAxis({
    super.key,
    this.reverse = false,
    required this.child,
    this.duration = const Duration(milliseconds: 250),
    this.fillColor,
  });

  final bool reverse;
  final Widget child;
  final Duration duration;
  final Color? fillColor;

  @override
  Widget build(BuildContext context) {
    return PageTransitionSwitcher(
      reverse: reverse,
      duration: duration,
      transitionBuilder: (
        Widget child,
        Animation<double> animation,
        Animation<double> secondaryAnimation,
      ) =>
          SharedAxisTransition(
        animation: animation,
        fillColor: fillColor,
        secondaryAnimation: secondaryAnimation,
        transitionType: SharedAxisTransitionType.horizontal,
        child: child,
      ),
      child: child,
    );
  }
}
