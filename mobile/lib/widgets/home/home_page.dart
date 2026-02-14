import 'package:app/store/store.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/history/transcription_tile.dart';
import 'package:app/widgets/home/stat_value.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = useAppStore().select(context, (s) => s.user);
    final theme = Theme.of(context);

    final now = DateTime.now();
    final placeholders = [
      (
        'This is a placeholder for your most recent transcription. It will show the actual text once transcriptions are available.',
        now.subtract(const Duration(hours: 1)),
      ),
      (
        'Another example transcription would appear here with the actual content from your voice recordings.',
        now.subtract(const Duration(days: 1)),
      ),
      (
        'Your third most recent transcription text will be displayed in this spot.',
        now.subtract(const Duration(days: 3)),
      ),
    ];

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
                    label: 'Words Total',
                    value: user?.wordsTotal ?? 0,
                  ),
                ),
                Expanded(
                  child: StatValue(
                    label: 'This Month',
                    value: user?.wordsThisMonth ?? 0,
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: Theming.padding.withoutTop(),
          sliver: SliverToBoxAdapter(child: TextField(maxLines: null)),
        ),
        SliverPadding(
          padding: Theming.padding.onlyHorizontal().withTop(28),
          sliver: SliverToBoxAdapter(
            child: Text(
              'Recent Transcriptions',
              style: theme.textTheme.headlineMedium,
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 12)),
        SliverList.list(
          children: placeholders
              .map((e) => TranscriptionTile(text: e.$1, date: e.$2))
              .toList(),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: Theming.padding,
            child: SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () => context.push('/dashboard/history'),
                icon: const Icon(Icons.history),
                label: const Text('View All'),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
