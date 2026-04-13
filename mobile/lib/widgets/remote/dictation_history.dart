import 'package:app/model/session_history_entry.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/remote/assistant_turn_card.dart';
import 'package:app/widgets/remote/dictation_message.dart';
import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';

class DictationHistory extends StatelessWidget {
  const DictationHistory({
    super.key,
    required this.history,
    required this.activeTurnId,
    required this.partialText,
    required this.isLoading,
    required this.isRecording,
    required this.isDenying,
    required this.swiperController,
    required this.onSwipe,
  });

  final List<SessionHistoryEntry> history;
  final String? activeTurnId;
  final String partialText;
  final bool isLoading;
  final bool isRecording;
  final bool isDenying;
  final CardSwiperController swiperController;
  final void Function(
    SessionHistoryEntry turn,
    int reviewIndex,
    CardSwiperDirection direction,
  )
  onSwipe;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];
    for (final entry in history) {
      if (entry.isAssistant) {
        final isActive = entry.id != null && entry.id == activeTurnId;
        final onQuestion = isActive && entry.nextPendingReviewIndex == null;
        items.add(
          AssistantTurnCard(
            key: ValueKey('turn-${entry.id}'),
            entry: entry,
            isActive: isActive,
            activeSwiperController: isActive ? swiperController : null,
            onSwipe: (idx, dir) => onSwipe(entry, idx, dir),
            partialAnswer:
                onQuestion && isRecording && !isDenying ? partialText : '',
            isAnsweringQuestion: onQuestion,
          ),
        );
      } else if (entry.message != null) {
        items.add(
          DictationMessage(
            key: ValueKey('msg-${entry.id}'),
            text: entry.message!,
            sentAt: entry.sentAt,
          ),
        );
      }
    }

    if (partialText.isNotEmpty && activeTurnId == null) {
      items.add(DictationMessage(text: partialText));
    }
    if (isLoading) items.add(const _LoadingIndicator());

    return ListView.separated(
      padding: Theming.padding.copyWith(top: 16, bottom: 16),
      reverse: true,
      itemCount: items.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) => items[items.length - 1 - index],
    );
  }
}

class _LoadingIndicator extends StatelessWidget {
  const _LoadingIndicator();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
      child: Row(
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}
