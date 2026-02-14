import 'package:app/widgets/common/app_list_tile.dart';
import 'package:flutter/material.dart';

class GlossaryTermTile extends StatelessWidget {
  const GlossaryTermTile({
    super.key,
    required this.value,
    this.onEdit,
  });

  final String value;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    return AppListTile(
      title: Chip(label: Text(value)),
      trailing: onEdit != null
          ? IconButton(
              icon: const Icon(Icons.edit),
              onPressed: onEdit,
            )
          : null,
      onTap: onEdit,
    );
  }
}
