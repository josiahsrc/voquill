import 'dart:ui';

import 'package:app/utils/color_utils.dart';
import 'package:flutter/material.dart';
import 'package:simple_animations/simple_animations.dart';

class CompressionController {
  final ValueNotifier<bool> _pressed = ValueNotifier(false);

  bool get pressed => _pressed.value;
  set pressed(bool value) {
    _pressed.value = value;
  }

  void dispose() {
    _pressed.dispose();
  }
}

class Compression extends StatefulWidget {
  const Compression({
    super.key,
    required this.child,
    this.curve = Curves.easeInOut,
    this.durationIn = Duration.zero,
    this.durationOut = const Duration(milliseconds: 100),
    this.compression = .95,
    this.tint = Colors.black12,
    this.controller,
    this.compressed = false,
  });

  final Widget child;
  final Curve curve;
  final Duration durationIn;
  final Duration durationOut;
  final Color tint;
  final double compression;
  final CompressionController? controller;
  final bool compressed;

  @override
  State<Compression> createState() => _CompressionState();
}

class _CompressionState extends State<Compression> with AnimationMixin {
  late CompressionController compressionController;
  late Animation<double> t;
  late AnimationController ctrl;
  bool mustDispose = false;

  double get curveT => widget.curve.transform(t.value);

  @override
  void initState() {
    ctrl = createController();
    t = Tween<double>(begin: 0.0, end: 1.0).animate(ctrl);
    initializeCompressionController();
    super.initState();
  }

  void initializeCompressionController() {
    mustDispose = widget.controller == null;
    compressionController = widget.controller ?? CompressionController();
    compressionController._pressed.addListener(() {
      if (compressionController.pressed) {
        ctrl.play(duration: widget.durationIn);
      } else {
        ctrl.playReverse(duration: widget.durationOut);
      }
    });
  }

  void tryDisposeCompressionController() {
    if (mustDispose) {
      compressionController.dispose();
    }
  }

  @override
  void dispose() {
    tryDisposeCompressionController();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant Compression oldWidget) {
    if (oldWidget.controller != widget.controller) {
      tryDisposeCompressionController();
      initializeCompressionController();
    }

    if (oldWidget.compressed != widget.compressed) {
      compressionController.pressed = widget.compressed;
    }
    super.didUpdateWidget(oldWidget);
  }

  @override
  Widget build(BuildContext context) {
    final tintedChild = ColorFiltered(
      colorFilter: ColorFilter.mode(
        Color.lerp(widget.tint.withApproxOpacity(0), widget.tint, curveT)!,
        BlendMode.srcATop,
      ),
      child: widget.child,
    );

    return Transform.scale(
      scale: lerpDouble(1.0, widget.compression, curveT),
      child: tintedChild,
    );
  }
}

class PressableCompression extends StatefulWidget {
  const PressableCompression({super.key, required this.child});

  final Widget child;

  @override
  State<PressableCompression> createState() => _PressableCompressionState();
}

class _PressableCompressionState extends State<PressableCompression> {
  final controller = CompressionController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: (_) => controller.pressed = true,
      onPointerUp: (_) => controller.pressed = false,
      onPointerCancel: (_) => controller.pressed = false,
      child: Compression(
        controller: controller,
        durationIn: const Duration(milliseconds: 150),
        durationOut: const Duration(milliseconds: 150),
        child: widget.child,
      ),
    );
  }
}
