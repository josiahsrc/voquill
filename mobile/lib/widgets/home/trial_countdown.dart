import 'package:app/theme/app_colors.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class TrialCountdown extends StatelessWidget {
  const TrialCountdown({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    const daysRemaining = 5;
    const totalDays = 7;
    const progress = daysRemaining / totalDays;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.level1,
        borderRadius: BorderRadius.circular(Theming.radiusValue),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.hourglass_bottom_rounded,
                      size: 18,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '$daysRemaining days left',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: colors.onLevel1.withAlpha(26),
                    valueColor: AlwaysStoppedAnimation(colors.blue),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          ActionChip(
            onPressed: () {},
            backgroundColor: colors.blue,
            labelStyle: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: colors.onBlue,
            ),
            side: BorderSide.none,
            label: const Text('Upgrade'),
          ),
        ],
      ),
    );
  }
}
