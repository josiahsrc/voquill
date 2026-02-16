import 'package:app/store/store.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/utils/user_utils.dart';
import 'package:app/widgets/history/transcription_detail_dialog.dart';
import 'package:app/widgets/history/transcription_tile.dart';
import 'package:app/widgets/home/stat_value.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = useAppStore().select(context, (s) => s.user);
    final sortedIds = useAppStore().select(
      context,
      (s) => s.sortedTranscriptionIds,
    );
    final theme = Theme.of(context);
    final recentIds = sortedIds.take(3).toList();

    return CustomScrollView(
      slivers: [
        SliverAppBar.large(
          title: Text('Welcome${user?.name != null ? ', ${user!.name}' : ''}'),
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
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
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
