import 'dart:async';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

mixin StreamSubscriptionMixin<T extends StatefulWidget> on State<T> {
  StreamSubscription? _sub;

  /// Override this method to return the stream subscription you want to manage
  StreamSubscription subscribe();

  @override
  void initState() {
    super.initState();
    _sub = subscribe();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

extension WidgetX on Widget {
  Widget padded([EdgeInsetsGeometry? padding]) {
    return Padding(padding: padding ?? Theming.padding, child: this);
  }

  Widget scaleFadeIn({
    Duration delay = Duration.zero,
    Duration duration = const Duration(milliseconds: 300),
    double begin = 0.95,
    double end = 1.0,
  }) {
    return animate()
        .fadeIn(delay: delay, duration: duration)
        .scale(begin: Offset(begin, begin), end: Offset(end, end));
  }
}
