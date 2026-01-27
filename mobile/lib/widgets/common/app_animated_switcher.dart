import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class AppAnimatedSwitcher extends StatelessWidget {
  const AppAnimatedSwitcher({
    super.key,
    required this.child,
    this.alignment = Alignment.center,
    this.duration = Theming.duration,
    this.axis,
    this.scale = 0.5,
  });

  factory AppAnimatedSwitcher.fab({Key? key, required Widget child}) {
    return AppAnimatedSwitcher(
      key: key,
      alignment: Alignment.bottomRight,
      axis: Axis.horizontal,
      child: child,
    );
  }

  factory AppAnimatedSwitcher.page({Key? key, required Widget child}) {
    return AppAnimatedSwitcher(key: key, scale: 0.95, child: child);
  }

  final Widget child;
  final Alignment alignment;
  final Duration duration;
  final Axis? axis;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: duration,
      switchInCurve: Curves.easeInOut,
      switchOutCurve: Curves.easeInOut,
      child: child,
      transitionBuilder: (child, animation) => _SmoothFadeAndScale(
        animation: animation,
        alignment: alignment,
        axis: axis,
        scale: scale,
        child: child,
      ),
    );
  }
}

class _SmoothFadeAndScale extends StatelessWidget {
  const _SmoothFadeAndScale({
    required this.animation,
    required this.child,
    required this.alignment,
    required this.axis,
    required this.scale,
  });

  final Animation<double> animation;
  final Axis? axis;
  final Widget child;
  final Alignment alignment;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final scale = Tween<double>(begin: this.scale, end: 1).animate(animation);
    final opacity = Tween<double>(begin: 0, end: 1).animate(animation);
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        return Transform.scale(
          scale: axis == null ? scale.value : null,
          scaleX: axis == Axis.horizontal ? scale.value : null,
          scaleY: axis == Axis.vertical ? scale.value : null,
          alignment: alignment,
          child: Opacity(opacity: opacity.value, child: child),
        );
      },
      child: child,
    );
  }
}
