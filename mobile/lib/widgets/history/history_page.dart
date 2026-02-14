import 'package:app/store/store.dart';
import 'package:app/widgets/history/transcription_detail_dialog.dart';
import 'package:app/widgets/history/transcription_tile.dart';
import 'package:flutter/material.dart';

class HistoryPage extends StatelessWidget {
  const HistoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    final sortedIds = useAppStore().select(
      context,
      (s) => s.sortedTranscriptionIds,
    );

    final page = CustomScrollView(
      slivers: [
        const SliverAppBar.large(title: Text('History')),
        if (sortedIds.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.mic_none,
                    size: 48,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.3),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'No transcriptions yet',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          SliverList.builder(
            itemCount: sortedIds.length,
            itemBuilder: (context, index) {
              final id = sortedIds[index];
              return TranscriptionTile(
                id: id,
                onTap: () => TranscriptionDetailDialog.show(context, id),
              );
            },
          ),
      ],
    );

    return Scaffold(body: page);
  }
}
