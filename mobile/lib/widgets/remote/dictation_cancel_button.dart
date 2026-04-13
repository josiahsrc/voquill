import 'package:app/theme/app_colors.dart';
import 'package:app/widgets/remote/dictation_pill.dart';
import 'package:flutter/material.dart';

class DictationCancelButton extends StatelessWidget {
  const DictationCancelButton({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: DictationPill.height,
        height: DictationPill.height,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: context.colors.level1,
        ),
        child: Icon(
          Icons.close_rounded,
          size: 28,
          color: theme.colorScheme.onSurface,
        ),
      ),
    );
  }
}
