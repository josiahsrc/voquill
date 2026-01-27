import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:simple_animations/animation_mixin/animation_mixin.dart';

class AnimatedOffstage extends StatefulWidget {
  const AnimatedOffstage({
    super.key,
    required this.child,
    required this.offstage,
    this.duration = const Duration(milliseconds: 200),
    this.curve = Curves.easeInOut,
  });

  final Widget child;
  final bool offstage;
  final Duration duration;
  final Curve curve;

  @override
  State<AnimatedOffstage> createState() => _AnimatedOffstageState();
}

class _AnimatedOffstageState extends State<AnimatedOffstage>
    with AnimationMixin {
  late Animation<double> _t;

  @override
  void initState() {
    _t = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(parent: controller, curve: widget.curve));
    controller.duration = widget.duration;
    controller.value = widget.offstage ? 1 : 0;
    super.initState();
  }

  @override
  void didUpdateWidget(covariant AnimatedOffstage oldWidget) {
    controller.duration = widget.duration;
    if (oldWidget.offstage != widget.offstage) {
      if (widget.offstage) {
        controller.forward();
      } else {
        controller.reverse();
      }
    }
    super.didUpdateWidget(oldWidget);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return _ChildScaleBox(
          percent: 1 - _t.value,
          child: _ChildOverflowBox(
            child: Opacity(opacity: 1 - _t.value, child: widget.child),
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// Takes a [child] and a [percent]. If [percent] is 1, then the child's
/// size is used. If [percent] is 0, then the child's size is 0. These values
/// are interpolated.
class _ChildScaleBox extends SingleChildRenderObjectWidget {
  const _ChildScaleBox({required this.percent, super.child});

  final double percent;

  @override
  _RenderChildScaleBox createRenderObject(BuildContext context) {
    return _RenderChildScaleBox(
      percent: percent,
      textDirection: Directionality.of(context),
    );
  }

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderChildScaleBox renderObject,
  ) {
    renderObject
      ..percent = percent
      ..textDirection = Directionality.of(context);
  }
}

class _RenderChildScaleBox extends RenderAligningShiftedBox {
  _RenderChildScaleBox({
    required double percent,
    required TextDirection textDirection,
  }) : _percent = percent,
       super(alignment: Alignment.center, textDirection: textDirection);

  double _percent;
  double get percent => _percent;
  set percent(double value) {
    if (value == _percent) return;
    _percent = value;
    markNeedsLayout();
  }

  @override
  double computeMinIntrinsicWidth(double height) => 0.0;

  @override
  double computeMinIntrinsicHeight(double width) => 0.0;

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    if (child != null) {
      final Size childSize = child!.getDryLayout(const BoxConstraints());
      return Size(
        math.max(
          constraints.minWidth,
          math.min(constraints.maxWidth, childSize.width * percent),
        ),
        math.max(
          constraints.minHeight,
          math.min(constraints.maxHeight, childSize.height * percent),
        ),
      );
    } else {
      return constraints.biggest;
    }
  }

  @override
  void performLayout() {
    final BoxConstraints constraints = this.constraints;
    if (child != null) {
      child!.layout(const BoxConstraints(), parentUsesSize: true);
      size = Size(
        math.max(
          constraints.minWidth,
          math.min(constraints.maxWidth, child!.size.width * percent),
        ),
        math.max(
          constraints.minHeight,
          math.min(constraints.maxHeight, child!.size.height * percent),
        ),
      );
      alignChild();
    } else {
      size = constraints.biggest;
    }
  }
}

// This widget's size matches its child's size unless its constraints
// force it to be larger or smaller. The child is centered.
//
// Used to encapsulate extended FABs whose size is fixed, using Row
// and MainAxisSize.min, to be as wide as their label and icon.
class _ChildOverflowBox extends SingleChildRenderObjectWidget {
  const _ChildOverflowBox({super.child});

  @override
  _RenderChildOverflowBox createRenderObject(BuildContext context) {
    return _RenderChildOverflowBox(textDirection: Directionality.of(context));
  }

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderChildOverflowBox renderObject,
  ) {
    renderObject.textDirection = Directionality.of(context);
  }
}

class _RenderChildOverflowBox extends RenderAligningShiftedBox {
  _RenderChildOverflowBox({super.textDirection})
    : super(alignment: Alignment.center);

  @override
  double computeMinIntrinsicWidth(double height) => 0.0;

  @override
  double computeMinIntrinsicHeight(double width) => 0.0;

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    if (child != null) {
      final Size childSize = child!.getDryLayout(const BoxConstraints());
      return Size(
        math.max(
          constraints.minWidth,
          math.min(constraints.maxWidth, childSize.width),
        ),
        math.max(
          constraints.minHeight,
          math.min(constraints.maxHeight, childSize.height),
        ),
      );
    } else {
      return constraints.biggest;
    }
  }

  @override
  void performLayout() {
    final BoxConstraints constraints = this.constraints;
    if (child != null) {
      child!.layout(const BoxConstraints(), parentUsesSize: true);
      size = Size(
        math.max(
          constraints.minWidth,
          math.min(constraints.maxWidth, child!.size.width),
        ),
        math.max(
          constraints.minHeight,
          math.min(constraints.maxHeight, child!.size.height),
        ),
      );
      alignChild();
    } else {
      size = constraints.biggest;
    }
  }
}
