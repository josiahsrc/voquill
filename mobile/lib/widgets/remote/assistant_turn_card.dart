import 'package:animations/animations.dart';
import 'package:app/model/session_history_entry.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/widgets/remote/remote_review_fullscreen.dart';
import 'package:flutter/material.dart';

class AssistantTurnCard extends StatelessWidget {
  const AssistantTurnCard({
    super.key,
    required this.entry,
    required this.isActive,
    required this.sessionId,
  });

  final SessionHistoryEntry entry;
  final bool isActive;
  final String sessionId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reviews = entry.reviewList;
    final questions = entry.questionList;
    final showBeginButton = isActive && entry.hasPendingItems;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (entry.summary != null && entry.summary!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(entry.summary!, style: theme.textTheme.bodyMedium),
            ),
          for (final review in reviews) _ReviewRow(review: review),
          for (final question in questions) _QuestionRow(question: question),
          if (showBeginButton)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: _BeginReviewButton(
                sessionId: sessionId,
                pendingReviewCount: reviews.where((r) => r.isPending).length,
                pendingQuestionCount:
                    questions.where((q) => q.isPending).length,
              ),
            ),
        ],
      ),
    );
  }
}

class _BeginReviewButton extends StatelessWidget {
  const _BeginReviewButton({
    required this.sessionId,
    required this.pendingReviewCount,
    required this.pendingQuestionCount,
  });

  final String sessionId;
  final int pendingReviewCount;
  final int pendingQuestionCount;

  String _label() {
    if (pendingReviewCount > 0) return 'Begin review';
    if (pendingQuestionCount > 0) return 'Answer questions';
    return 'Respond';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    return OpenContainer(
      transitionDuration: const Duration(milliseconds: 260),
      transitionType: ContainerTransitionType.fadeThrough,
      closedElevation: 0,
      openElevation: 0,
      closedColor: colors.level1,
      openColor: theme.colorScheme.surface,
      closedShape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      closedBuilder: (context, open) => InkWell(
        onTap: open,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _label(),
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_rounded,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                size: 20,
              ),
            ],
          ),
        ),
      ),
      openBuilder: (context, _) =>
          RemoteReviewFullscreen(sessionId: sessionId),
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

    final IconData icon;
    final Color color;
    if (review.isPending) {
      icon = Icons.radio_button_unchecked_rounded;
      color = theme.colorScheme.onSurface.withValues(alpha: 0.35);
    } else if (review.isApproved) {
      icon = Icons.check_circle_rounded;
      color = colors.success;
    } else {
      icon = Icons.cancel_rounded;
      color = colors.error;
    }

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
                    color: theme.colorScheme.onSurface.withValues(
                      alpha: review.isPending ? 0.4 : 0.85,
                    ),
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
  const _QuestionRow({required this.question});

  final AssistantQuestion question;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    final icon = question.isPending
        ? Icons.radio_button_unchecked_rounded
        : Icons.check_circle_rounded;
    final color = question.isPending
        ? theme.colorScheme.onSurface.withValues(alpha: 0.35)
        : colors.success;

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
                  question.message,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(
                      alpha: question.isPending ? 0.4 : 0.85,
                    ),
                  ),
                ),
                if (question.response != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    question.response!,
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
