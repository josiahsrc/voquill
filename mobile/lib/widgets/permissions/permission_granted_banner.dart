import 'package:app/theme/app_colors.dart';
import 'package:flutter/material.dart';

class PermissionGrantedBanner extends StatelessWidget {
  const PermissionGrantedBanner({
    super.key,
    required this.text,
  });

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle, color: context.colors.success),
          const SizedBox(width: 6),
          Text(
            text,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: context.colors.success,
            ),
          ),
        ],
      ),
    );
  }
}
