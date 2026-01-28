import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// A row-like widget that sizes itself to the tallest child,
/// then relayouts all children with that exact height so they match.
/// Width is shrink-wrapped to children + gaps.
/// No flex; intended for small child counts.
class EqualHeightRow extends MultiChildRenderObjectWidget {
  const EqualHeightRow({
    super.key,
    this.spacing = 0,
    this.mainAxisAlignment = MainAxisAlignment.start,
    super.children,
  });

  final double spacing;
  final MainAxisAlignment mainAxisAlignment;

  @override
  RenderObject createRenderObject(BuildContext context) {
    return RenderEqualHeightRow(
      gap: spacing,
      mainAxisAlignment: mainAxisAlignment,
      textDirection: Directionality.maybeOf(context),
    );
  }

  @override
  void updateRenderObject(
    BuildContext context,
    covariant RenderEqualHeightRow renderObject,
  ) {
    renderObject
      ..gap = spacing
      ..mainAxisAlignment = mainAxisAlignment
      ..textDirection = Directionality.maybeOf(context);
  }
}

class EqualHeightRowParentData extends ContainerBoxParentData<RenderBox> {}

class RenderEqualHeightRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, EqualHeightRowParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, EqualHeightRowParentData> {
  RenderEqualHeightRow({
    required double gap,
    required MainAxisAlignment mainAxisAlignment,
    TextDirection? textDirection,
  }) : _gap = gap,
       _mainAxisAlignment = mainAxisAlignment,
       _textDirection = textDirection;

  double _gap;
  MainAxisAlignment _mainAxisAlignment;
  TextDirection? _textDirection;

  double get gap => _gap;
  set gap(double value) {
    if (_gap == value) return;
    _gap = value;
    markNeedsLayout();
  }

  MainAxisAlignment get mainAxisAlignment => _mainAxisAlignment;
  set mainAxisAlignment(MainAxisAlignment value) {
    if (_mainAxisAlignment == value) return;
    _mainAxisAlignment = value;
    markNeedsLayout();
  }

  TextDirection? get textDirection => _textDirection;
  set textDirection(TextDirection? value) {
    if (_textDirection == value) return;
    _textDirection = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderObject child) {
    if (child.parentData is! EqualHeightRowParentData) {
      child.parentData = EqualHeightRowParentData();
    }
  }

  // First pass sizes, then lock equal height, second pass for final widths.
  @override
  void performLayout() {
    final BoxConstraints constraints = this.constraints;
    final bool hasChildren = firstChild != null;

    if (!hasChildren) {
      size = constraints.constrain(const Size(0, 0));
      return;
    }

    // Pass 1: loose layout to discover natural sizes.
    final List<RenderBox> childList = <RenderBox>[];
    var child = firstChild;
    while (child != null) {
      child.layout(
        constraints.loosen(), // lets child pick its natural size
        parentUsesSize: true,
      );
      childList.add(child);
      child = childAfter(child);
    }

    double maxChildHeight = 0;
    for (final c in childList) {
      maxChildHeight = mathMax(maxChildHeight, c.size.height);
    }

    // Clamp final row height to parent constraints but prefer tallest child.
    final double equalHeight = clampDouble(
      maxChildHeight,
      constraints.minHeight,
      constraints.hasBoundedHeight ? constraints.maxHeight : maxChildHeight,
    );

    // Pass 2: relayout every child with tight height = equalHeight.
    double totalWidth = 0;
    for (final c in childList) {
      final BoxConstraints childConstraints = BoxConstraints(
        minWidth: 0,
        maxWidth: constraints.hasBoundedWidth
            ? constraints.maxWidth
            : double.infinity,
        minHeight: equalHeight,
        maxHeight: equalHeight,
      );
      c.layout(childConstraints, parentUsesSize: true);
      totalWidth += c.size.width;
    }
    if (childList.length > 1) totalWidth += gap * (childList.length - 1);

    // Row’s own size is shrink-wrapped to children + gaps.
    final double finalWidth = clampDouble(
      totalWidth,
      constraints.minWidth,
      constraints.hasBoundedWidth ? constraints.maxWidth : totalWidth,
    );
    size = Size(finalWidth, equalHeight);

    // Compute x offsets per MainAxisAlignment.
    final double contentWidth =
        childList.fold<double>(0, (sum, c) => sum + c.size.width) +
        (childList.length > 1 ? gap * (childList.length - 1) : 0);
    final double extraSpace = finalWidth - contentWidth;
    double leadingSpace = 0;
    double betweenSpace = gap;

    switch (mainAxisAlignment) {
      case MainAxisAlignment.start:
        leadingSpace = 0;
        betweenSpace = gap;
        break;
      case MainAxisAlignment.end:
        leadingSpace = extraSpace;
        betweenSpace = gap;
        break;
      case MainAxisAlignment.center:
        leadingSpace = extraSpace / 2.0;
        betweenSpace = gap;
        break;
      case MainAxisAlignment.spaceBetween:
        leadingSpace = 0;
        betweenSpace = childList.length > 1
            ? (finalWidth - (totalWidth - gap * (childList.length - 1))) /
                  (childList.length - 1)
            : 0;
        break;
      case MainAxisAlignment.spaceAround:
        betweenSpace = childList.isNotEmpty
            ? (finalWidth - (totalWidth - gap * (childList.length - 1))) /
                  childList.length
            : 0;
        leadingSpace = betweenSpace / 2.0;
        break;
      case MainAxisAlignment.spaceEvenly:
        betweenSpace = childList.isNotEmpty
            ? (finalWidth - (totalWidth - gap * (childList.length - 1))) /
                  (childList.length + 1)
            : 0;
        leadingSpace = betweenSpace;
        break;
    }

    // Respect text direction for start/end.
    final bool rtl = (textDirection ?? TextDirection.ltr) == TextDirection.rtl;

    // Position children.
    double x = leadingSpace;
    if (rtl) x = size.width - leadingSpace;

    for (final c in childList) {
      final parentData = c.parentData as EqualHeightRowParentData;
      if (rtl) {
        x -= c.size.width;
        parentData.offset = Offset(x, 0);
        x -= betweenSpace;
      } else {
        parentData.offset = Offset(x, 0);
        x += c.size.width + betweenSpace;
      }
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    defaultPaint(context, offset);
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    return defaultHitTestChildren(result, position: position);
  }

  // Intrinsics: height is tallest child; width is sum + gaps.
  double _sumChildWidthsWithLooseHeights(double height) {
    double w = 0;
    var child = firstChild;
    while (child != null) {
      w += child.getMaxIntrinsicWidth(height);
      child = childAfter(child);
    }
    if (childCount > 1) w += gap * (childCount - 1);
    return w;
  }

  double _maxChildHeightWithLooseWidths(double width) {
    double h = 0;
    var child = firstChild;
    while (child != null) {
      h = mathMax(h, child.getMaxIntrinsicHeight(width));
      child = childAfter(child);
    }
    return h;
  }

  @override
  double computeMinIntrinsicWidth(double height) =>
      _sumChildWidthsWithLooseHeights(height);

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _sumChildWidthsWithLooseHeights(height);

  @override
  double computeMinIntrinsicHeight(double width) =>
      _maxChildHeightWithLooseWidths(width);

  @override
  double computeMaxIntrinsicHeight(double width) =>
      _maxChildHeightWithLooseWidths(width);
}

// Helpers
double mathMax(double a, double b) => a > b ? a : b;
double clampDouble(double value, double min, double max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
