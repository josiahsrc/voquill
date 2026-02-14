import 'dart:async';

import 'package:app/store/store.dart';
import 'package:app/utils/date_utils.dart';
import 'package:app/widgets/common/app_list_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class TranscriptionTile extends StatefulWidget {
  const TranscriptionTile({
    super.key,
    required this.id,
    this.onTap,
  });

  final String id;
  final VoidCallback? onTap;

  @override
  State<TranscriptionTile> createState() => _TranscriptionTileState();
}

class _TranscriptionTileState extends State<TranscriptionTile> {
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => setState(() {}),
    );
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final transcription =
        useAppStore().select(context, (s) => s.transcriptionById[widget.id]);
    if (transcription == null) return const SizedBox.shrink();

    return AppListTile(
      onTap: widget.onTap,
      title: Text(
        transcription.text.replaceAll(RegExp(r'\s*\n\s*'), ' '),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(formatRelativeDate(transcription.createdAtDate)),
      trailing: IconButton(
        icon: const Icon(Icons.copy, size: 20),
        onPressed: () {
          Clipboard.setData(ClipboardData(text: transcription.text));
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Copied to clipboard'),
              duration: Duration(seconds: 1),
            ),
          );
        },
      ),
    );
  }
}
