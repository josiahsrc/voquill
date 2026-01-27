import 'package:app/utils/theme_utils.dart';
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

class SplitBarSegment {
  const SplitBarSegment({required this.value, required this.color, this.child});

  final double value;
  final Color color;
  final Widget? child;
}

class SplitBar extends MultiChildRenderObjectWidget {
  SplitBar({super.key, required this.segments})
    : super(children: segments.map((e) => e.child ?? Container()).toList());

  final List<SplitBarSegment> segments;

  List<double> get percents {
    final tot = segments.fold(0.0, (sum, segment) => sum + segment.value);
    return segments.map((segment) => segment.value / tot).toList();
  }

  List<Color> get colors => segments.map((e) => e.color).toList();

  @override
  RenderObject createRenderObject(BuildContext context) {
    return RenderSplitBar()
      ..percents = percents
      ..colors = colors;
  }

  @override
  void updateRenderObject(
    BuildContext context,
    covariant RenderSplitBar renderObject,
  ) {
    renderObject.percents = percents;
    renderObject.colors = colors;
    super.updateRenderObject(context, renderObject);
  }
}

class SplitBarParentData extends ContainerBoxParentData<RenderBox> {}

class RenderSplitBar extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, SplitBarParentData> {
  List<double> _percents = [];
  List<double> get percents => _percents;
  set percents(List<double> value) {
    if (const ListEquality().equals(_percents, value)) return;
    _percents = value;
    markNeedsLayout();
    markNeedsPaint();
  }

  List<Color> _colors = [];
  List<Color> get colors => _colors;
  set colors(List<Color> value) {
    if (const ListEquality().equals(_colors, value)) return;
    _colors = value;
    markNeedsLayout();
    markNeedsPaint();
  }

  @override
  void setupParentData(RenderObject child) {
    if (child.parentData is! SplitBarParentData) {
      child.parentData = SplitBarParentData();
    }
  }

  @override
  void performLayout() {
    final constraints = this.constraints;
    final percents = this.percents;

    final total = percents.fold(0.0, (sum, percent) => sum + percent);
    final widths = percents.map((percent) => percent / total).toList();

    var startPercent = 0.0;
    var child = firstChild;
    var index = 0;
    while (child != null) {
      final offsetX = startPercent * constraints.maxWidth;
      final width = widths[index] * constraints.maxWidth;
      final childConstraints = BoxConstraints.tightFor(
        width: width,
        height: constraints.maxHeight,
      );

      child.layout(childConstraints, parentUsesSize: true);
      final childParentData = child.parentData as SplitBarParentData;
      childParentData.offset = Offset(offsetX, 0);

      startPercent += percents[index];
      index++;
      child = childAfter(child);
    }

    size = constraints.biggest;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final percents = this.percents;
    final colors = this.colors;
    const Radius radius = Theming.radius;

    var startPercent = 0.0;
    var child = firstChild;
    var index = 0;
    while (child != null) {
      final width = percents[index] * size.width;
      final offsetX = startPercent * size.width;
      final isFirst = index == 0;
      final isLast = index == percents.length - 1;

      final fillPaint = Paint()
        ..color = colors[index]
        ..style = PaintingStyle.fill;
      final innerRect = Rect.fromLTWH(
        offset.dx + offsetX,
        offset.dy,
        width,
        size.height,
      );

      RRect rrect;
      if (isFirst && isLast) {
        rrect = RRect.fromRectAndRadius(innerRect, radius);
      } else if (isLast) {
        rrect = RRect.fromLTRBAndCorners(
          innerRect.left,
          innerRect.top,
          innerRect.right,
          innerRect.bottom,
          topRight: radius,
          bottomRight: radius,
        );
      } else if (isFirst) {
        rrect = RRect.fromLTRBAndCorners(
          innerRect.left,
          innerRect.top,
          innerRect.right,
          innerRect.bottom,
          topLeft: radius,
          bottomLeft: radius,
        );
      } else {
        rrect = RRect.fromRectAndRadius(innerRect, Radius.zero);
      }

      context.canvas.drawRRect(rrect, fillPaint);
      final data = child.parentData as SplitBarParentData;
      context.paintChild(child, offset + data.offset);

      startPercent += percents[index];
      index++;
      child = childAfter(child);
    }
  }
}
