import 'dart:math';

import 'package:flutter/material.dart';

String _formatCompact(int value) {
  if (value < 1000) return '$value';
  final suffixes = ['', 'k', 'M', 'B'];
  final tier = (log(value) / ln10 / 3).floor().clamp(0, suffixes.length - 1);
  final divisor = pow(10, tier * 3);
  final scaled = value / divisor;
  final formatted =
      scaled >= 10 ? scaled.toStringAsFixed(0) : scaled.toStringAsFixed(1);
  final cleaned =
      formatted.endsWith('.0') ? formatted.substring(0, formatted.length - 2) : formatted;
  return '$cleaned${suffixes[tier]}';
}

class StatValue extends StatelessWidget {
  const StatValue({
    super.key,
    required this.label,
    required this.value,
    this.icon,
  });

  final String label;
  final int value;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _formatCompact(value),
              style: theme.textTheme.displaySmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            if (icon != null) ...[
              const SizedBox(width: 4),
              icon!,
            ],
          ],
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withAlpha(153),
          ),
        ),
      ],
    );
  }
}
