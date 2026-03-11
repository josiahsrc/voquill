import 'dart:math';

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

class KeyboardRowParentData extends ContainerBoxParentData<RenderBox> {
  int weight = 1;
  double? maxWidth;
  bool isSpacer = false;
}

class KeyboardRowChildData extends ParentDataWidget<KeyboardRowParentData> {
  final int weight;
  final double? maxWidth;
  final bool isSpacer;

  const KeyboardRowChildData({
    super.key,
    required super.child,
    this.weight = 1,
    this.maxWidth,
    this.isSpacer = false,
  });

  @override
  void applyParentData(RenderObject renderObject) {
    final parentData = renderObject.parentData! as KeyboardRowParentData;
    var needsLayout = false;

    if (parentData.weight != weight) {
      parentData.weight = weight;
      needsLayout = true;
    }
    if (parentData.maxWidth != maxWidth) {
      parentData.maxWidth = maxWidth;
      needsLayout = true;
    }
    if (parentData.isSpacer != isSpacer) {
      parentData.isSpacer = isSpacer;
      needsLayout = true;
    }

    if (needsLayout) {
      final targetParent = renderObject.parent;
      if (targetParent is RenderObject) {
        targetParent.markNeedsLayout();
      }
    }
  }

  @override
  Type get debugTypicalAncestorWidgetClass => KeyboardRowLayout;
}

class KeyboardRowLayout extends MultiChildRenderObjectWidget {
  final MainAxisAlignment mainAxisAlignment;

  const KeyboardRowLayout({
    super.key,
    super.children,
    this.mainAxisAlignment = MainAxisAlignment.center,
  });

  @override
  RenderObject createRenderObject(BuildContext context) {
    return RenderKeyboardRow(mainAxisAlignment: mainAxisAlignment);
  }

  @override
  void updateRenderObject(
    BuildContext context,
    RenderKeyboardRow renderObject,
  ) {
    renderObject.mainAxisAlignment = mainAxisAlignment;
  }
}

class RenderKeyboardRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, KeyboardRowParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, KeyboardRowParentData> {
  MainAxisAlignment _mainAxisAlignment;

  RenderKeyboardRow({
    MainAxisAlignment mainAxisAlignment = MainAxisAlignment.center,
  }) : _mainAxisAlignment = mainAxisAlignment;

  set mainAxisAlignment(MainAxisAlignment value) {
    if (_mainAxisAlignment != value) {
      _mainAxisAlignment = value;
      markNeedsLayout();
    }
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! KeyboardRowParentData) {
      child.parentData = KeyboardRowParentData();
    }
  }

  @override
  void performLayout() {
    final available = constraints.maxWidth;

    // Collect children and their parent data
    final children = <RenderBox>[];
    final dataList = <KeyboardRowParentData>[];
    var child = firstChild;
    while (child != null) {
      final pd = child.parentData! as KeyboardRowParentData;
      children.add(child);
      dataList.add(pd);
      child = pd.nextSibling;
    }

    final count = children.length;
    final widths = List<double>.filled(count, 0);
    final settled = List<bool>.filled(count, false);

    // Mark spacers as settled — they only get leftover at the end
    for (var i = 0; i < count; i++) {
      if (dataList[i].isSpacer) settled[i] = true;
    }

    // Non-spacer weight total
    var remaining = available;
    var remainingWeight = 0;
    for (var i = 0; i < count; i++) {
      if (!settled[i]) remainingWeight += dataList[i].weight;
    }

    // Iteratively allocate non-spacer keys, clamping at maxWidth
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < count; i++) {
        if (settled[i]) continue;
        final maxW = dataList[i].maxWidth;
        if (maxW == null) continue;
        final proportional = remaining * dataList[i].weight / remainingWeight;
        if (proportional > maxW) {
          widths[i] = maxW;
          remaining -= maxW;
          remainingWeight -= dataList[i].weight;
          settled[i] = true;
          changed = true;
        }
      }
    }

    // Give unsettled non-spacer keys their proportional share
    for (var i = 0; i < count; i++) {
      if (settled[i]) continue;
      widths[i] = remaining * dataList[i].weight / remainingWeight;
    }

    // Leftover after all non-spacer keys → distribute to spacers
    final nonSpacerTotal = widths.fold(0.0, (s, w) => s + w);
    final leftover = max(0.0, available - nonSpacerTotal);
    var spacerTotalWeight = 0;
    for (var i = 0; i < count; i++) {
      if (dataList[i].isSpacer) spacerTotalWeight += dataList[i].weight;
    }
    if (spacerTotalWeight > 0) {
      for (var i = 0; i < count; i++) {
        if (dataList[i].isSpacer) {
          widths[i] = leftover * dataList[i].weight / spacerTotalWeight;
        }
      }
    }

    // Layout children and position them
    var maxHeight = 0.0;
    for (var i = 0; i < count; i++) {
      final w = widths[i];
      children[i].layout(
        BoxConstraints(minWidth: w, maxWidth: w, maxHeight: constraints.maxHeight),
        parentUsesSize: true,
      );
      maxHeight = max(maxHeight, children[i].size.height);
    }

    // Position children with mainAxisAlignment
    final totalUsed = widths.fold(0.0, (s, w) => s + w);
    final freeSpace = max(0.0, available - totalUsed);
    final childCount = count;

    double leadingSpace;
    double betweenSpace;
    switch (_mainAxisAlignment) {
      case MainAxisAlignment.start:
        leadingSpace = 0;
        betweenSpace = 0;
      case MainAxisAlignment.end:
        leadingSpace = freeSpace;
        betweenSpace = 0;
      case MainAxisAlignment.center:
        leadingSpace = freeSpace / 2;
        betweenSpace = 0;
      case MainAxisAlignment.spaceBetween:
        leadingSpace = 0;
        betweenSpace = childCount > 1 ? freeSpace / (childCount - 1) : 0;
      case MainAxisAlignment.spaceAround:
        betweenSpace = childCount > 0 ? freeSpace / childCount : 0;
        leadingSpace = betweenSpace / 2;
      case MainAxisAlignment.spaceEvenly:
        betweenSpace = childCount > 0 ? freeSpace / (childCount + 1) : 0;
        leadingSpace = betweenSpace;
    }

    var x = leadingSpace;
    for (var i = 0; i < count; i++) {
      dataList[i].offset = Offset(x, 0);
      x += widths[i] + betweenSpace;
    }

    size = constraints.constrain(Size(available, maxHeight));
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    defaultPaint(context, offset);
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    return defaultHitTestChildren(result, position: position);
  }
}
