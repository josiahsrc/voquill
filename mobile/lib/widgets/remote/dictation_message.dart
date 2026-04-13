import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class DictationMessage extends StatelessWidget {
  const DictationMessage({super.key, required this.text, this.sentAt});

  final String text;
  final DateTime? sentAt;

  bool get _isPartial => sentAt == null;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isPartial) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Text(
          text,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            fontStyle: FontStyle.italic,
          ),
        ),
      );
    }

    final timeFormat = DateFormat.jm();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(
                Icons.check_circle_outline_rounded,
                size: 14,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
              ),
              const SizedBox(width: 4),
              Text(
                'Sent ${timeFormat.format(sentAt!)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
