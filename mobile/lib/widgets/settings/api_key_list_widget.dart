import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_radio.dart';
import 'package:app/widgets/settings/add_api_key_dialog.dart';
import 'package:app/widgets/settings/ai_configuration_sheet.dart';
import 'package:flutter/material.dart';

class ApiKeyListWidget extends StatefulWidget {
  final AiConfigContext configContext;
  final ScrollController scrollController;

  const ApiKeyListWidget({
    super.key,
    required this.configContext,
    required this.scrollController,
  });

  @override
  State<ApiKeyListWidget> createState() => _ApiKeyListWidgetState();
}

class _ApiKeyListWidgetState extends State<ApiKeyListWidget> {
  List<ApiKey> _keys = [];
  String? _selectedKeyId;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<ApiKey> get _filteredKeys {
    return _keys.where((k) {
      return widget.configContext == AiConfigContext.transcription
          ? k.provider.supportsTranscription
          : k.provider.supportsPostProcessing;
    }).toList();
  }

  Future<void> _load() async {
    final keys = await loadApiKeys();
    final selectedId = widget.configContext == AiConfigContext.transcription
        ? await getSelectedTranscriptionKeyId()
        : await getSelectedPostProcessingKeyId();
    if (mounted) {
      setState(() {
        _keys = keys;
        _selectedKeyId = selectedId;
        _loading = false;
      });
    }
  }

  Future<void> _selectKey(String id) async {
    setState(() => _selectedKeyId = id);
    if (widget.configContext == AiConfigContext.transcription) {
      await setSelectedTranscriptionKeyId(id);
    } else {
      await setSelectedPostProcessingKeyId(id);
    }
  }

  Future<void> _addKey() async {
    final result = await showDialog<ApiKey>(
      context: context,
      builder: (_) => AddApiKeyDialog(configContext: widget.configContext),
    );
    if (result != null) {
      await _load();
      await _selectKey(result.id);
    }
  }

  Future<void> _editKey(ApiKey key) async {
    final result = await showDialog<ApiKey>(
      context: context,
      builder: (_) => AddApiKeyDialog(
        existingKey: key,
        configContext: widget.configContext,
      ),
    );
    if (result != null) {
      await _load();
    }
  }

  Future<void> _deleteKey(ApiKey key) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete API Key'),
        content: Text('Delete "${key.name}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await deleteApiKey(key.id);
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filteredKeys = _filteredKeys;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      controller: widget.scrollController,
      padding: Theming.padding.onlyHorizontal(),
      children: [
        if (filteredKeys.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Column(
              children: [
                Icon(
                  Icons.key_outlined,
                  size: 48,
                  color: theme.colorScheme.onSurface.withAlpha(102),
                ),
                const SizedBox(height: 16),
                Text(
                  'No API keys configured',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withAlpha(153),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        for (final key in filteredKeys)
          _ApiKeyTile(
            apiKey: key,
            isSelected: key.id == _selectedKeyId,
            onSelect: () => _selectKey(key.id),
            onEdit: () => _editKey(key),
            onDelete: () => _deleteKey(key),
            configContext: widget.configContext,
          ),
        const SizedBox(height: 8),
        FilledButton.tonalIcon(
          onPressed: _addKey,
          icon: const Icon(Icons.add),
          label: const Text('Add API Key'),
        ),
      ],
    );
  }
}

class _ApiKeyTile extends StatelessWidget {
  final ApiKey apiKey;
  final bool isSelected;
  final VoidCallback onSelect;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final AiConfigContext configContext;

  const _ApiKeyTile({
    required this.apiKey,
    required this.isSelected,
    required this.onSelect,
    required this.onEdit,
    required this.onDelete,
    required this.configContext,
  });

  String? get _modelDisplay {
    return configContext == AiConfigContext.transcription
        ? apiKey.transcriptionModel
        : apiKey.postProcessingModel;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final model = _modelDisplay;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isSelected
            ? BorderSide(color: theme.colorScheme.primary, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: onSelect,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              AppRadio(isSelected),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      apiKey.name,
                      style: theme.textTheme.titleSmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${apiKey.provider.displayName} · ····${apiKey.keySuffix}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withAlpha(153),
                      ),
                    ),
                    if (model != null && model.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        model,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary.withAlpha(179),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.edit_outlined, size: 20),
                onPressed: onEdit,
                tooltip: 'Edit',
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20),
                onPressed: onDelete,
                tooltip: 'Delete',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
