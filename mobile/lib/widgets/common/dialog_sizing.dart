import 'package:flutter/material.dart';

class DialogSizing extends StatelessWidget {
  const DialogSizing({super.key, required this.child, this.width = 400});

  final Widget child;
  final double width;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints.tightFor(width: width),
      child: child,
    );
  }
}
