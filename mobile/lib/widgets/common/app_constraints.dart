import 'package:flutter/material.dart';

class AppConstraints extends StatelessWidget {
  const AppConstraints({
    super.key,
    this.maxWidth = double.infinity,
    required this.child,
    this.center = false,
  });

  const AppConstraints.sm({super.key, required this.child})
    : maxWidth = 400,
      center = true;

  final double maxWidth;
  final Widget child;
  final bool center;

  @override
  Widget build(BuildContext context) {
    final box = ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: child,
    );

    return center ? Center(child: box) : box;
  }
}
