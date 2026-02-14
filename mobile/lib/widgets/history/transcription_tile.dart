import 'package:app/store/store.dart';
import 'package:app/widgets/common/app_list_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

class TranscriptionTile extends StatelessWidget {
  const TranscriptionTile({
    super.key,
    required this.id,
    this.onTap,
  });

  final String id;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final transcription =
        useAppStore().select(context, (s) => s.transcriptionById[id]);
    if (transcription == null) return const SizedBox.shrink();

    return AppListTile(
      onTap: onTap,
      title: Text(
        transcription.text,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        DateFormat.yMMMd().add_jm().format(transcription.createdAtDate),
      ),
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
