import 'package:app/store/store.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/utils/member_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/utils/user_utils.dart';
import 'package:app/widgets/history/transcription_detail_dialog.dart';
import 'package:app/widgets/history/transcription_tile.dart';
import 'package:app/widgets/home/stat_value.dart';
import 'package:app/widgets/home/trial_countdown.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = useAppStore().select(context, (s) => s.user);
    final (plan, isOnTrial) = useAppStore().select(
      context,
      (s) => (getEffectivePlan(s), getIsOnTrial(s)),
    );
    final sortedIds = useAppStore().select(
      context,
      (s) => s.sortedTranscriptionIds,
    );
    final theme = Theme.of(context);
    final colors = context.colors;
    final recentIds = sortedIds.take(3).toList();

    final (chipLabel, chipBg, chipFg) = switch ((plan, isOnTrial)) {
      (_, true) => ('Pro trial', colors.level2, colors.onLevel2),
      (EffectivePlan.pro, _) => ('Pro', colors.blue, colors.onBlue),
      (EffectivePlan.free, _) => ('Free', colors.level2, colors.onLevel2),
    };

    return CustomScrollView(
      slivers: [
        SliverAppBar.large(
          title: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Flexible(
                child: Text(
                  'Welcome${user?.name != null ? ', ${user!.name}' : ''}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: chipBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    chipLabel,
                    style: theme.textTheme.labelMedium?.copyWith(color: chipFg),
                  ),
                ),
              ),
            ],
          ),
        ),
        SliverPadding(
          padding: Theming.padding,
          sliver: SliverToBoxAdapter(
            child: Row(
              children: [
                Expanded(
                  child: StatValue(
                    label: 'Words total',
                    value: user?.wordsTotal ?? 0,
                  ),
                ),
                Expanded(
                  child: StatValue(
                    label: 'This month',
                    value: user?.wordsThisMonth ?? 0,
                  ),
                ),
                Expanded(
                  child: StatValue(
                    label: 'Day streak',
                    value: getEffectiveStreak(user),
                    icon: const Icon(
                      Icons.local_fire_department_rounded,
                      color: Color(0xFFFF6B35),
                      size: 32,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (isOnTrial)
          SliverPadding(
            padding: Theming.padding.onlyHorizontal().withTop(16),
            sliver: const SliverToBoxAdapter(child: TrialCountdown()),
          ),
        SliverPadding(
          padding: Theming.padding.onlyHorizontal().withTop(28),
          sliver: SliverToBoxAdapter(
            child: Text(
              'Recent transcriptions',
              style: theme.textTheme.headlineMedium,
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 12)),
        if (recentIds.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding.onlyHorizontal(),
              child: Text(
                'Your transcriptions from the keyboard will appear here.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: context.colors.level1,
                ),
              ),
            ),
          )
        else ...[
          SliverList.list(
            children: recentIds
                .map(
                  (id) => TranscriptionTile(
                    id: id,
                    onTap: () => TranscriptionDetailDialog.show(context, id),
                  ),
                )
                .toList(),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding,
              child: Center(
                child: ActionChip(
                  label: const Text('View all'),
                  avatar: const Icon(Icons.history),
                  backgroundColor: Colors.transparent,
                  side: BorderSide.none,
                  onPressed: () => context.push('/dashboard/history'),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
