import 'package:app/store/store.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/utils/member_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class TrialCountdown extends StatelessWidget {
  const TrialCountdown({super.key});

  @override
  Widget build(BuildContext context) {
    final isOnTrial = useAppStore().select(
      context,
      (s) => getIsOnTrial(s),
    );
    final daysRemaining = useAppStore().select(
      context,
      (s) => getTrialDaysRemaining(s),
    );
    final progress = useAppStore().select(
      context,
      (s) => getTrialProgress(s),
    );

    if (!isOnTrial || daysRemaining == null || progress == null) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colors = context.colors;

    final label = daysRemaining == 0
        ? 'Last day'
        : daysRemaining == 1
            ? '1 day left'
            : '$daysRemaining days left';

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
                      label,
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
