import 'package:app/widgets/common/app_list_tile.dart';
import 'package:flutter/material.dart';

class ReplacementRuleTile extends StatelessWidget {
  const ReplacementRuleTile({
    super.key,
    required this.original,
    required this.replacement,
    this.onEdit,
  });

  final String original;
  final String replacement;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppListTile(
      title: Row(
        children: [
          Flexible(child: Chip(label: Text(original))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Icon(
              Icons.arrow_forward,
              size: 20,
              color: theme.colorScheme.onSurface.withAlpha(153),
            ),
          ),
          Flexible(child: Chip(label: Text(replacement))),
        ],
      ),
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
