import 'package:app/model/api_key_model.dart';
import 'package:app/model/common_model.dart';
import 'package:app/widgets/common/app_list_tile.dart';
import 'package:app/widgets/common/list_tile_section.dart';
import 'package:app/widgets/settings/api_key_dialog.dart';
import 'package:flutter/material.dart';

class ApiKeyListWidget extends StatelessWidget {
  const ApiKeyListWidget({
    super.key,
    required this.apiKeys,
    required this.selectedApiKeyId,
    required this.status,
    required this.onSelect,
    required this.onDelete,
    required this.onAdd,
  });

  final List<ApiKeyEntry> apiKeys;
  final String? selectedApiKeyId;
  final ActionStatus status;
  final void Function(String id) onSelect;
  final void Function(String id) onDelete;
  final void Function(ApiKeyDialogResult result) onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (apiKeys.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'No API keys configured. Add one to get started.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withAlpha(153),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => _showAddDialog(context),
            icon: const Icon(Icons.add),
            label: const Text('Add API key'),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ListTileSection(
          children: apiKeys.map((key) {
            final isSelected = key.id == selectedApiKeyId;
            final suffix = key.keySuffix != null ? ' ••••${key.keySuffix}' : '';
            return AppListTile(
              leading: Icon(
                isSelected ? Icons.check_circle : Icons.circle_outlined,
                color: isSelected ? theme.colorScheme.primary : null,
              ),
              title: Text(key.name),
              subtitle: Text('${key.provider}$suffix'),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _confirmDelete(context, key),
              ),
              onTap: () => onSelect(key.id),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: () => _showAddDialog(context),
          icon: const Icon(Icons.add),
          label: const Text('Add API key'),
        ),
      ],
    );
  }

  Future<void> _showAddDialog(BuildContext context) async {
    final result = await showDialog<ApiKeyDialogResult>(
      context: context,
      builder: (_) => const ApiKeyDialog(),
    );
    if (result != null) {
      onAdd(result);
    }
  }

  Future<void> _confirmDelete(BuildContext context, ApiKeyEntry key) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete API Key'),
        content: Text('Are you sure you want to delete "${key.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      onDelete(key.id);
    }
  }
}
