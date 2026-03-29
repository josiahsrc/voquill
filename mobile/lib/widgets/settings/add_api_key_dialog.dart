import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class AddApiKeyDialog extends StatefulWidget {
  const AddApiKeyDialog({super.key});

  @override
  State<AddApiKeyDialog> createState() => _AddApiKeyDialogState();
}

class _AddApiKeyDialogState extends State<AddApiKeyDialog> {
  final _nameController = TextEditingController();
  final _keyController = TextEditingController();
  final _baseUrlController = TextEditingController();
  ApiKeyProvider _provider = ApiKeyProvider.openai;
  bool _saving = false;
  bool _obscureKey = true;

  bool get _canSave =>
      _nameController.text.trim().isNotEmpty &&
      _keyController.text.trim().isNotEmpty &&
      (!_provider.needsBaseUrl || _baseUrlController.text.trim().isNotEmpty);

  Future<void> _save() async {
    if (!_canSave) return;
    setState(() => _saving = true);

    try {
      final baseUrl = _provider.needsBaseUrl
          ? _baseUrlController.text.trim()
          : null;
      final apiKey = await createApiKey(
        name: _nameController.text.trim(),
        provider: _provider,
        keyValue: _keyController.text.trim(),
        baseUrl: baseUrl,
      );
      if (mounted) Navigator.pop(context, apiKey);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save API key: $e')),
        );
        setState(() => _saving = false);
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _keyController.dispose();
    _baseUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      insetPadding: Theming.padding.onlyHorizontal(),
      title: const Text('Add API Key'),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  hintText: 'e.g. My OpenAI Key',
                ),
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<ApiKeyProvider>(
                initialValue: _provider,
                decoration: const InputDecoration(labelText: 'Provider'),
                items: ApiKeyProvider.values
                    .map((p) => DropdownMenuItem(
                          value: p,
                          child: Text(p.displayName),
                        ))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _provider = v);
                },
              ),
              if (_provider.needsBaseUrl) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _baseUrlController,
                  decoration: InputDecoration(
                    labelText: 'Base URL',
                    hintText: _provider == ApiKeyProvider.speaches
                        ? 'http://localhost:8080'
                        : 'https://your-server.com/v1',
                  ),
                  keyboardType: TextInputType.url,
                  onChanged: (_) => setState(() {}),
                ),
              ],
              const SizedBox(height: 16),
              TextField(
                controller: _keyController,
                decoration: InputDecoration(
                  labelText: 'API Key',
                  hintText: 'sk-...',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureKey ? Icons.visibility_off : Icons.visibility,
                    ),
                    onPressed: () => setState(() => _obscureKey = !_obscureKey),
                  ),
                ),
                obscureText: _obscureKey,
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving || !_canSave ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Save'),
        ),
      ],
    );
  }
}
