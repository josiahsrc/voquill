import 'package:app/model/session_history_entry.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/remote/assistant_turn_card.dart';
import 'package:app/widgets/remote/dictation_message.dart';
import 'package:flutter/material.dart';

class DictationHistory extends StatefulWidget {
  const DictationHistory({
    super.key,
    required this.sessionId,
    required this.history,
    required this.activeTurnId,
    required this.partialText,
    required this.isLoading,
  });

  final String sessionId;
  final List<SessionHistoryEntry> history;
  final String? activeTurnId;
  final String partialText;
  final bool isLoading;

  @override
  State<DictationHistory> createState() => _DictationHistoryState();
}

class _DictationHistoryState extends State<DictationHistory> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];
    for (final entry in widget.history) {
      if (entry.isAssistant) {
        final isActive = entry.id != null && entry.id == widget.activeTurnId;
        items.add(
          AssistantTurnCard(
            key: ValueKey('turn-${entry.id}'),
            entry: entry,
            isActive: isActive,
            sessionId: widget.sessionId,
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

    return Column(
      children: [
        Expanded(
          child: Scrollbar(
            controller: _scrollController,
            thumbVisibility: true,
            child: ListView.separated(
              controller: _scrollController,
              padding: Theming.padding.copyWith(top: 16, bottom: 8),
              reverse: true,
              itemCount: items.length,
              cacheExtent: 99999,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) => items[items.length - 1 - index],
            ),
          ),
        ),
        if (widget.partialText.isNotEmpty)
          Padding(
            padding: Theming.padding.copyWith(top: 0, bottom: 0),
            child: DictationMessage(text: widget.partialText),
          ),
        if (widget.isLoading)
          Padding(
            padding: Theming.padding.copyWith(top: 0, bottom: 0),
            child: const _LoadingIndicator(),
          ),
      ],
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
