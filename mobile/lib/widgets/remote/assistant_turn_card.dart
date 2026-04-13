import 'package:app/model/session_history_entry.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/widgets/remote/dictation_review_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';

class AssistantTurnCard extends StatelessWidget {
  const AssistantTurnCard({
    super.key,
    required this.entry,
    required this.isActive,
    required this.activeSwiperController,
    required this.onSwipe,
    required this.partialAnswer,
    required this.isAnsweringQuestion,
  });

  final SessionHistoryEntry entry;
  final bool isActive;
  final CardSwiperController? activeSwiperController;
  final void Function(int reviewIndex, CardSwiperDirection direction) onSwipe;
  final String partialAnswer;
  final bool isAnsweringQuestion;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reviews = entry.reviewList;
    final questions = entry.questionList;
    final pendingReviewIndex = entry.nextPendingReviewIndex;
    final pendingQuestionIndex = entry.nextPendingQuestionIndex;

    final showReviewSwiper =
        isActive && pendingReviewIndex != null && activeSwiperController != null;

    final questionsReached = pendingReviewIndex == null;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (entry.summary != null && entry.summary!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                entry.summary!,
                style: theme.textTheme.bodyMedium,
              ),
            ),
          for (var i = 0; i < reviews.length; i++)
            if (!reviews[i].isPending)
              _ReviewRow(review: reviews[i]),
          if (showReviewSwiper)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: _PendingReviewSwiper(
                reviews: reviews,
                startIndex: pendingReviewIndex,
                controller: activeSwiperController!,
                onSwipe: onSwipe,
              ),
            ),
          if (questionsReached)
            for (var i = 0; i < questions.length; i++)
              if (!questions[i].isPending ||
                  (isActive && i == pendingQuestionIndex))
                _QuestionRow(
                  question: questions[i],
                  isActivePrompt: isActive &&
                      i == pendingQuestionIndex &&
                      isAnsweringQuestion,
                  partialAnswer:
                      isActive && i == pendingQuestionIndex ? partialAnswer : '',
                  isPending: questions[i].isPending,
                ),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.review});

  final AssistantReview review;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    final icon = review.isApproved
        ? Icons.check_circle_rounded
        : Icons.cancel_rounded;
    final color = review.isApproved ? colors.success : colors.error;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  review.message,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.85),
                  ),
                ),
                if (review.isDenied && review.response != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    review.response!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuestionRow extends StatelessWidget {
  const _QuestionRow({
    required this.question,
    required this.isActivePrompt,
    required this.partialAnswer,
    required this.isPending,
  });

  final AssistantQuestion question;
  final bool isActivePrompt;
  final String partialAnswer;
  final bool isPending;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    if (!isPending) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(
                Icons.check_circle_rounded,
                size: 18,
                color: colors.success,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    question.message,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color:
                          theme.colorScheme.onSurface.withValues(alpha: 0.85),
                    ),
                  ),
                  if (question.response != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      question.response!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.55),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(
              Icons.help_outline_rounded,
              size: 18,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  question.message,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                if (isActivePrompt && partialAnswer.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    partialAnswer,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PendingReviewSwiper extends StatelessWidget {
  const _PendingReviewSwiper({
    required this.reviews,
    required this.startIndex,
    required this.controller,
    required this.onSwipe,
  });

  final List<AssistantReview> reviews;
  final int startIndex;
  final CardSwiperController controller;
  final void Function(int reviewIndex, CardSwiperDirection direction) onSwipe;

  @override
  Widget build(BuildContext context) {
    final pending = <_Pending>[];
    for (var i = startIndex; i < reviews.length; i++) {
      if (reviews[i].isPending) pending.add(_Pending(i, reviews[i]));
    }
    if (pending.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 220,
      child: CardSwiper(
        key: ValueKey('swiper-${pending.first.index}-${pending.length}'),
        controller: controller,
        cardsCount: pending.length,
        numberOfCardsDisplayed: pending.length.clamp(1, 3),
        backCardOffset: const Offset(0, 12),
        padding: EdgeInsets.zero,
        isLoop: false,
        allowedSwipeDirection: const AllowedSwipeDirection.only(
          left: true,
          right: true,
        ),
        onSwipe: (prev, _, direction) {
          onSwipe(pending[prev].index, direction);
          return true;
        },
        cardBuilder: (context, i, percentX, _) => DictationReviewCard(
          message: pending[i].review.message,
          approveProgress: (percentX / 100).clamp(0.0, 1.0),
          denyProgress: (-percentX / 100).clamp(0.0, 1.0),
        ),
      ),
    );
  }
}

class _Pending {
  final int index;
  final AssistantReview review;
  const _Pending(this.index, this.review);
}
