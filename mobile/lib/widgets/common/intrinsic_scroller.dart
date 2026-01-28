import 'package:flutter/material.dart';

class IntrinsicScroller extends StatelessWidget {
  const IntrinsicScroller({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.axis = Axis.vertical,
    this.controller,
    this.physics,
  });

  final Widget child;
  final EdgeInsets padding;
  final Axis axis;
  final ScrollController? controller;
  final ScrollPhysics? physics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: _constrainedBuild);
  }

  Widget _constrainedBuild(BuildContext context, BoxConstraints constraints) {
    final boxConstraints = BoxConstraints(
      minWidth: constraints.maxWidth,
      minHeight: constraints.maxHeight,
    );

    final paddedContent = Padding(padding: padding, child: child);

    Widget intrinsicContent;
    if (axis == Axis.horizontal) {
      intrinsicContent = IntrinsicWidth(child: paddedContent);
    } else if (axis == Axis.vertical) {
      intrinsicContent = IntrinsicHeight(child: paddedContent);
    } else {
      throw UnimplementedError();
    }

    return SingleChildScrollView(
      physics: physics,
      controller: controller,
      scrollDirection: axis,
      child: ConstrainedBox(
        constraints: boxConstraints,
        child: intrinsicContent,
      ),
    );
  }
}
