import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class SystemOverlay extends StatelessWidget {
  const SystemOverlay({super.key, required this.child, this.style});

  factory SystemOverlay.light({Key? key, required Widget child}) {
    return SystemOverlay(
      key: key,
      style: SystemUiOverlayStyle.light,
      child: child,
    );
  }

  factory SystemOverlay.dark({Key? key, required Widget child}) {
    return SystemOverlay(
      key: key,
      style: SystemUiOverlayStyle.dark,
      child: child,
    );
  }

  final Widget child;
  final SystemUiOverlayStyle? style;

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final value =
        style ??
        (mq.platformBrightness == Brightness.light
            ? SystemUiOverlayStyle.dark
            : SystemUiOverlayStyle.light);

    return AnnotatedRegion<SystemUiOverlayStyle>(value: value, child: child);
  }
}
