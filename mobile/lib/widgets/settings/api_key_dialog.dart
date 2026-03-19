import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_dialog.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ApiKeyDialogResult {
  const ApiKeyDialogResult({
    required this.name,
    required this.provider,
    required this.apiKey,
    this.baseUrl,
    this.model,
  });

  final String name;
  final String provider;
  final String apiKey;
  final String? baseUrl;
  final String? model;
}

const defaultProviders = [
  ('groq', 'Groq'),
  ('openai', 'OpenAI'),
  ('deepgram', 'Deepgram'),
  ('assemblyai', 'AssemblyAI'),
  ('elevenlabs', 'ElevenLabs'),
  ('gemini', 'Gemini'),
  ('azure', 'Azure'),
  ('openai-compatible', 'OpenAI Compatible'),
  ('speaches', 'Speaches'),
];

bool _providerNeedsBaseUrl(String provider) =>
    provider == 'openai-compatible' ||
    provider == 'speaches' ||
    provider == 'ollama';

bool _providerSupportsModel(String provider) =>
    provider != 'deepgram' && provider != 'assemblyai';

class ApiKeyDialog extends StatefulWidget {
  const ApiKeyDialog({super.key, this.providers});

  final List<(String, String)>? providers;

  @override
  State<ApiKeyDialog> createState() => _ApiKeyDialogState();
}

class _ApiKeyDialogState extends State<ApiKeyDialog> {
  final _nameController = TextEditingController();
  final _baseUrlController = TextEditingController();
  final _apiKeyController = TextEditingController();
  final _modelController = TextEditingController();

  late String _selectedProvider;
  bool _testing = false;

  List<(String, String)> get _providers => widget.providers ?? defaultProviders;

  @override
  void initState() {
    super.initState();
    _selectedProvider = _providers.first.$1;
  }

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

  Future<bool> _testApiKey() async {
    final provider = _selectedProvider;
    final apiKey = _apiKeyController.text.trim();
    final baseUrl = _baseUrlController.text.trim();

    try {
      switch (provider) {
        case 'groq':
          final response = await http.get(
            Uri.parse('https://api.groq.com/openai/v1/models'),
            headers: {'Authorization': 'Bearer $apiKey'},
          );
          return response.statusCode == 200;
        case 'openai':
          final response = await http.get(
            Uri.parse('https://api.openai.com/v1/models'),
            headers: {'Authorization': 'Bearer $apiKey'},
          );
          return response.statusCode == 200;
        case 'deepgram':
          final response = await http.get(
            Uri.parse('https://api.deepgram.com/v1/projects'),
            headers: {'Authorization': 'Token $apiKey'},
          );
          return response.statusCode == 200;
        case 'assemblyai':
          final response = await http.get(
            Uri.parse('https://api.assemblyai.com/v2/transcript'),
            headers: {'Authorization': apiKey},
          );
          return response.statusCode == 200 || response.statusCode == 404;
        case 'elevenlabs':
          final response = await http.get(
            Uri.parse('https://api.elevenlabs.io/v1/user'),
            headers: {'xi-api-key': apiKey},
          );
          return response.statusCode == 200;
        case 'gemini':
          final response = await http.get(
            Uri.parse(
              'https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey',
            ),
          );
          return response.statusCode == 200;
        case 'azure':
          return true;
        case 'deepseek':
          final response = await http.get(
            Uri.parse('https://api.deepseek.com/v1/models'),
            headers: {'Authorization': 'Bearer $apiKey'},
          );
          return response.statusCode == 200;
        case 'claude':
          final response = await http.get(
            Uri.parse('https://api.anthropic.com/v1/models'),
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
          );
          return response.statusCode == 200;
        case 'openrouter':
          final response = await http.get(
            Uri.parse('https://openrouter.ai/api/v1/models'),
            headers: {'Authorization': 'Bearer $apiKey'},
          );
          return response.statusCode == 200;
        case 'ollama':
          if (baseUrl.isEmpty) return false;
          final url = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
          final response = await http
              .get(Uri.parse('${url}v1/models'))
              .timeout(const Duration(seconds: 5));
          return response.statusCode == 200;
        case 'openai-compatible':
          if (baseUrl.isEmpty) return false;
          final url = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
          final response = await http
              .get(
                Uri.parse('${url}v1/models'),
                headers: apiKey.isNotEmpty
                    ? {'Authorization': 'Bearer $apiKey'}
                    : {},
              )
              .timeout(const Duration(seconds: 5));
          return response.statusCode == 200;
        case 'speaches':
          if (baseUrl.isEmpty) return false;
          final url = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
          final response = await http
              .get(Uri.parse('${url}v1/models'))
              .timeout(const Duration(seconds: 5));
          return response.statusCode == 200;
        default:
          return true;
      }
    } catch (e) {
      return false;
    }
  }

  Future<void> _submit() async {
    if (!_isValid || _testing) return;
    setState(() {
      _testing = true;
    });

    final valid = await _testApiKey();

    if (!mounted) return;

    if (!valid) {
      setState(() {
        _testing = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'API key validation failed. Check your key and try again.',
          ),
        ),
      );
      return;
    }

    setState(() {
      _testing = false;
    });

    final baseUrl = _baseUrlController.text.trim();
    final model = _modelController.text.trim();

    Navigator.of(context).pop(
      ApiKeyDialogResult(
        name: _nameController.text.trim(),
        provider: _selectedProvider,
        apiKey: _apiKeyController.text.trim(),
        baseUrl: baseUrl.isEmpty ? null : baseUrl,
        model: model.isEmpty ? null : model,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showBaseUrl = _providerNeedsBaseUrl(_selectedProvider);
    final showModel = _providerSupportsModel(_selectedProvider);

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
              DropdownButtonFormField<String>(
                value: _selectedProvider,
                decoration: const InputDecoration(
                  labelText: 'Provider',
                  border: OutlineInputBorder(),
                ),
                items: _providers
                    .map(
                      (p) => DropdownMenuItem(
                        value: p.$1,
                        child: Text(p.$2),
                      ),
                    )
                    .toList(),
                onChanged: _testing
                    ? null
                    : (value) {
                        if (value != null) {
                          setState(() {
                            _selectedProvider = value;
                          });
                        }
                      },
              ),
              if (showBaseUrl) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _baseUrlController,
                  decoration: const InputDecoration(
                    labelText: 'Base URL',
                    hintText: 'http://127.0.0.1:8080',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.url,
                ),
              ],
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
              if (showModel) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _modelController,
                  decoration: const InputDecoration(
                    labelText: 'Model (optional)',
                    hintText: 'whisper-large-v3-turbo',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _testing ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: _isValid && !_testing ? _submit : null,
          child: _testing
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Add'),
        ),
      ],
    );
  }
}
