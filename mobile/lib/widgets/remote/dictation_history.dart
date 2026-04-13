import 'package:app/model/session_history_entry.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/remote/dictation_message.dart';
import 'package:app/widgets/remote/dictation_review_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';

class DictationHistory extends StatelessWidget {
  const DictationHistory({
    super.key,
    required this.history,
    required this.partialText,
    required this.isLoading,
    required this.swiperController,
    required this.onSwipe,
  });

  final List<SessionHistoryEntry> history;
  final String partialText;
  final bool isLoading;
  final CardSwiperController swiperController;
  final void Function(SessionHistoryEntry, CardSwiperDirection) onSwipe;

  List<_HistoryItem> _buildItems() {
    final items = <_HistoryItem>[];
    var i = 0;
    while (i < history.length) {
      if (history[i].isPendingReview) {
        final batch = <SessionHistoryEntry>[];
        while (i < history.length && history[i].isPendingReview) {
          batch.add(history[i]);
          i++;
        }
        items.add(_HistoryItem.swiper(batch));
      } else {
        items.add(_HistoryItem.message(history[i]));
        i++;
      }
    }
    if (partialText.isNotEmpty) items.add(_HistoryItem.partial(partialText));
    if (isLoading) items.add(const _HistoryItem.loading());
    return items;
  }

  @override
  Widget build(BuildContext context) {
    final items = _buildItems();
    return ListView.separated(
      padding: Theming.padding.copyWith(top: 16, bottom: 16),
      reverse: true,
      itemCount: items.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final item = items[items.length - 1 - index];
        return switch (item) {
          _PartialItem(:final text) => DictationMessage(text: text),
          _LoadingItem() => const _LoadingIndicator(),
          _MessageItem(:final entry) => DictationMessage(
            text: entry.message,
            sentAt: entry.sentAt,
          ),
          _ReviewSwiperItem(:final reviews) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: SizedBox(
              height: 220,
              child: CardSwiper(
                controller: swiperController,
                cardsCount: reviews.length,
                numberOfCardsDisplayed: reviews.length.clamp(1, 3),
                backCardOffset: const Offset(0, 12),
                padding: EdgeInsets.zero,
                isLoop: false,
                allowedSwipeDirection: const AllowedSwipeDirection.only(
                  left: true,
                  right: true,
                ),
                onSwipe: (prev, _, direction) {
                  onSwipe(reviews[prev], direction);
                  return true;
                },
                cardBuilder: (context, i, percentX, _) => DictationReviewCard(
                  message: reviews[i].message,
                  approveProgress: (percentX / 100).clamp(0.0, 1.0),
                  denyProgress: (-percentX / 100).clamp(0.0, 1.0),
                ),
              ),
            ),
          ),
        };
      },
    );
  }
}

sealed class _HistoryItem {
  const _HistoryItem();

  factory _HistoryItem.message(SessionHistoryEntry entry) = _MessageItem;
  factory _HistoryItem.partial(String text) = _PartialItem;
  const factory _HistoryItem.loading() = _LoadingItem;
  factory _HistoryItem.swiper(List<SessionHistoryEntry> reviews) =
      _ReviewSwiperItem;
}

class _MessageItem extends _HistoryItem {
  final SessionHistoryEntry entry;
  const _MessageItem(this.entry);
}

class _PartialItem extends _HistoryItem {
  final String text;
  const _PartialItem(this.text);
}

class _LoadingItem extends _HistoryItem {
  const _LoadingItem();
}

class _ReviewSwiperItem extends _HistoryItem {
  final List<SessionHistoryEntry> reviews;
  const _ReviewSwiperItem(this.reviews);
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
