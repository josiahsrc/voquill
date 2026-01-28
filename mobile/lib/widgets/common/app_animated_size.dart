import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class AppAnimatedSize extends StatelessWidget {
  const AppAnimatedSize({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: Theming.duration,
      curve: Curves.easeInOut,
      child: child,
    );
  }
}
