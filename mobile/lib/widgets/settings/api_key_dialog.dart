import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_dialog.dart';
import 'package:flutter/material.dart';

class ApiKeyDialogResult {
  const ApiKeyDialogResult({
    required this.name,
    required this.apiKey,
    this.baseUrl,
    this.model,
  });

  final String name;
  final String apiKey;
  final String? baseUrl;
  final String? model;
}

class ApiKeyDialog extends StatefulWidget {
  const ApiKeyDialog({super.key});

  @override
  State<ApiKeyDialog> createState() => _ApiKeyDialogState();
}

class _ApiKeyDialogState extends State<ApiKeyDialog> {
  final _nameController = TextEditingController();
  final _baseUrlController = TextEditingController();
  final _apiKeyController = TextEditingController();
  final _modelController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _baseUrlController.dispose();
    _apiKeyController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  bool get _isValid =>
      _nameController.text.trim().isNotEmpty &&
      _apiKeyController.text.trim().isNotEmpty;

  void _submit() {
    if (!_isValid) return;

    final baseUrl = _baseUrlController.text.trim();
    final model = _modelController.text.trim();

    Navigator.of(context).pop(
      ApiKeyDialogResult(
        name: _nameController.text.trim(),
        apiKey: _apiKeyController.text.trim(),
        baseUrl: baseUrl.isEmpty ? null : baseUrl,
        model: model.isEmpty ? null : model,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppDialog(
      title: const Text('Add API Key'),
      content: Padding(
        padding: Theming.padding.onlyVertical(),
        child: Padding(
          padding: Theming.padding.onlyHorizontal(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  hintText: 'My API Key',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              TextField(
                enabled: false,
                decoration: const InputDecoration(
                  labelText: 'Provider',
                  border: OutlineInputBorder(),
                ),
                controller: TextEditingController(text: 'OpenAI Compatible'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _baseUrlController,
                decoration: const InputDecoration(
                  labelText: 'Base URL (optional)',
                  hintText: 'http://127.0.0.1:8080',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _apiKeyController,
                decoration: const InputDecoration(
                  labelText: 'API Key',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _modelController,
                decoration: const InputDecoration(
                  labelText: 'Model (optional)',
                  hintText: 'gpt-4o',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: _isValid ? _submit : null,
          child: const Text('Add'),
        ),
      ],
    );
  }
}
