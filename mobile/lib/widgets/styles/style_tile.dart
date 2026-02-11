import 'package:app/widgets/common/app_list_tile.dart';
import 'package:flutter/material.dart';

class StyleTile extends StatelessWidget {
  const StyleTile({
    super.key,
    required this.name,
    required this.promptPreview,
    required this.isSelected,
    required this.onSelect,
    this.isSystem = false,
    this.onEdit,
  });

  final String name;
  final String promptPreview;
  final bool isSelected;
  final VoidCallback onSelect;
  final bool isSystem;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppListTile(
      leading: Icon(
        isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
        color: isSelected ? theme.colorScheme.primary : null,
      ),
      title: Text(name),
      subtitle: Text(
        promptPreview,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: isSystem
          ? null
          : IconButton(
              icon: const Icon(Icons.edit),
              onPressed: onEdit,
            ),
      onTap: onSelect,
    );
  }
}
