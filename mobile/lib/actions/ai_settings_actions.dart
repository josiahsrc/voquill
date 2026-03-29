import 'dart:convert';

import 'package:app/model/api_key_model.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

final _logger = createNamedLogger('ai_settings');

const _kTranscriptionMode = 'ai_transcription_mode';
const _kPostProcessingMode = 'ai_post_processing_mode';
const _kSelectedTranscriptionKeyId = 'ai_selected_transcription_key_id';
const _kSelectedPostProcessingKeyId = 'ai_selected_post_processing_key_id';
const _kApiKeys = 'ai_api_keys';
const _secureKeyPrefix = 'ai_api_key_value_';

final _secureStorage = const FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

Future<AiMode> getTranscriptionMode() async {
  final prefs = await SharedPreferences.getInstance();
  final value = prefs.getString(_kTranscriptionMode);
  if (value == AiMode.api.name) return AiMode.api;
  return AiMode.cloud;
}

Future<void> setTranscriptionMode(AiMode mode) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_kTranscriptionMode, mode.name);
  await syncKeyboardAiSettings();
}

Future<AiMode> getPostProcessingMode() async {
  final prefs = await SharedPreferences.getInstance();
  final value = prefs.getString(_kPostProcessingMode);
  if (value == AiMode.api.name) return AiMode.api;
  return AiMode.cloud;
}

Future<void> setPostProcessingMode(AiMode mode) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_kPostProcessingMode, mode.name);
  await syncKeyboardAiSettings();
}

Future<List<ApiKey>> loadApiKeys() async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(_kApiKeys);
  if (raw == null) return [];
  try {
    final list = jsonDecode(raw) as List;
    return list.map((e) => ApiKey.fromJson(e as Map<String, dynamic>)).toList();
  } catch (e) {
    _logger.w('Failed to parse API keys', e);
    return [];
  }
}

Future<void> _saveApiKeyList(List<ApiKey> keys) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_kApiKeys, jsonEncode(keys.map((k) => k.toJson()).toList()));
}

Future<ApiKey> createApiKey({
  required String name,
  required ApiKeyProvider provider,
  required String keyValue,
}) async {
  final keys = await loadApiKeys();
  final id = const Uuid().v4();
  final suffix = keyValue.length >= 4 ? keyValue.substring(keyValue.length - 4) : keyValue;
  final now = DateTime.now().toUtc().toIso8601String();

  final apiKey = ApiKey(
    id: id,
    name: name,
    provider: provider,
    keySuffix: suffix,
    createdAt: now,
  );

  await _secureStorage.write(key: '$_secureKeyPrefix$id', value: keyValue);
  keys.add(apiKey);
  await _saveApiKeyList(keys);
  return apiKey;
}

Future<void> deleteApiKey(String id) async {
  final keys = await loadApiKeys();
  keys.removeWhere((k) => k.id == id);
  await _secureStorage.delete(key: '$_secureKeyPrefix$id');
  await _saveApiKeyList(keys);

  final prefs = await SharedPreferences.getInstance();
  if (prefs.getString(_kSelectedTranscriptionKeyId) == id) {
    await prefs.remove(_kSelectedTranscriptionKeyId);
  }
  if (prefs.getString(_kSelectedPostProcessingKeyId) == id) {
    await prefs.remove(_kSelectedPostProcessingKeyId);
  }
  await syncKeyboardAiSettings();
}

Future<String?> getSelectedTranscriptionKeyId() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_kSelectedTranscriptionKeyId);
}

Future<void> setSelectedTranscriptionKeyId(String? id) async {
  final prefs = await SharedPreferences.getInstance();
  if (id == null) {
    await prefs.remove(_kSelectedTranscriptionKeyId);
  } else {
    await prefs.setString(_kSelectedTranscriptionKeyId, id);
  }
  await syncKeyboardAiSettings();
}

Future<String?> getSelectedPostProcessingKeyId() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_kSelectedPostProcessingKeyId);
}

Future<void> setSelectedPostProcessingKeyId(String? id) async {
  final prefs = await SharedPreferences.getInstance();
  if (id == null) {
    await prefs.remove(_kSelectedPostProcessingKeyId);
  } else {
    await prefs.setString(_kSelectedPostProcessingKeyId, id);
  }
  await syncKeyboardAiSettings();
}

Future<String?> getApiKeyValue(String id) async {
  return await _secureStorage.read(key: '$_secureKeyPrefix$id');
}

Future<void> syncKeyboardAiSettings() async {
  try {
    final transcriptionMode = await getTranscriptionMode();
    final postProcessingMode = await getPostProcessingMode();

    String? transcriptionProvider;
    String? transcriptionApiKey;
    String? postProcessingProvider;
    String? postProcessingApiKey;

    if (transcriptionMode == AiMode.api) {
      final keyId = await getSelectedTranscriptionKeyId();
      if (keyId != null) {
        final keys = await loadApiKeys();
        final key = keys.where((k) => k.id == keyId).firstOrNull;
        if (key != null) {
          transcriptionProvider = key.provider.name;
          transcriptionApiKey = await getApiKeyValue(keyId);
        }
      }
    }

    if (postProcessingMode == AiMode.api) {
      final keyId = await getSelectedPostProcessingKeyId();
      if (keyId != null) {
        final keys = await loadApiKeys();
        final key = keys.where((k) => k.id == keyId).firstOrNull;
        if (key != null) {
          postProcessingProvider = key.provider.name;
          postProcessingApiKey = await getApiKeyValue(keyId);
        }
      }
    }

    await syncKeyboardAiConfig(
      transcriptionMode: transcriptionMode.name,
      postProcessingMode: postProcessingMode.name,
      transcriptionProvider: transcriptionProvider,
      transcriptionApiKey: transcriptionApiKey,
      postProcessingProvider: postProcessingProvider,
      postProcessingApiKey: postProcessingApiKey,
    );
  } catch (e) {
    _logger.w('Failed to sync AI settings to keyboard', e);
  }
}
