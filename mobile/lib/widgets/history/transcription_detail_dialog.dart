import 'package:app/store/store.dart';
import 'package:app/widgets/common/app_draggable_scrollable_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

class TranscriptionDetailDialog extends StatelessWidget {
  const TranscriptionDetailDialog({super.key, required this.id});

  final String id;

  static Future<void> show(BuildContext context, String id) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => TranscriptionDetailDialog(id: id),
    );
  }

  void _copy(BuildContext context, String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copied to clipboard'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final transcription =
        useAppStore().select(context, (s) => s.transcriptionById[id]);
    if (transcription == null) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final date =
        DateFormat.yMMMd().add_jm().format(transcription.createdAtDate);

    return AppDraggableScrollableSheet(
      child: ListView(
        primary: true,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(date, style: theme.textTheme.bodySmall),
              ),
              if (transcription.toneName != null)
                Chip(
                  label: Text(transcription.toneName!),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Processed Text',
            text: transcription.text,
            onCopy: () => _copy(context, transcription.text),
          ),
          const SizedBox(height: 24),
          _Section(
            title: 'Raw Transcript',
            text: transcription.rawTranscript,
            onCopy: () => _copy(context, transcription.rawTranscript),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.text,
    required this.onCopy,
  });

  final String title;
  final String text;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: theme.textTheme.labelLarge,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.copy, size: 18),
              onPressed: onCopy,
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
        const SizedBox(height: 4),
        SelectableText(text, style: theme.textTheme.bodyLarge),
      ],
    );
  }
}
