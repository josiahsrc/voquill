import 'package:app/widgets/common/app_list_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

class TranscriptionTile extends StatelessWidget {
  const TranscriptionTile({
    super.key,
    required this.text,
    required this.date,
  });

  final String text;
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    return AppListTile(
      title: Text(
        text,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(DateFormat.yMMMd().add_jm().format(date)),
      trailing: IconButton(
        icon: const Icon(Icons.copy, size: 20),
        onPressed: () {
          Clipboard.setData(ClipboardData(text: text));
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
