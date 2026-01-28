import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class UniversalDisabler extends StatelessWidget {
  const UniversalDisabler({
    super.key,
    required this.child,
    this.disabled = true,
  });

  final Widget child;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    return AbsorbPointer(
      absorbing: disabled,
      child: AnimatedOpacity(
        opacity: disabled ? .3 : 1,
        duration: Theming.duration,
        curve: Curves.easeInOut,
        child: child,
      ),
    );
  }
}
