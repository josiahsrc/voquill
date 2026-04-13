import 'dart:convert';

import 'package:app/model/api_key_model.dart';
import 'package:app/model/local_transcription_model.dart';
import 'package:app/utils/channel_utils.dart' as channel_utils;
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

AiMode postProcessingModeForSync(AiMode mode) {
  if (mode == AiMode.local) {
    _logger.w('Syncing invalid local post-processing mode as cloud');
    return AiMode.cloud;
  }
  return mode;
}

Future<AiMode> getTranscriptionMode() async {
  final prefs = await SharedPreferences.getInstance();
  final value = prefs.getString(_kTranscriptionMode);
  if (value == AiMode.api.name) return AiMode.api;
  if (value == AiMode.local.name) return AiMode.local;
  return AiMode.cloud;
}

Future<void> _persistTranscriptionMode(AiMode mode) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_kTranscriptionMode, mode.name);
}

Future<void> setTranscriptionMode(AiMode mode) async {
  await _persistTranscriptionMode(mode);
  await syncKeyboardAiSettings();
}

Future<AiMode> getPostProcessingMode() async {
  final prefs = await SharedPreferences.getInstance();
  final value = prefs.getString(_kPostProcessingMode);
  if (value == AiMode.api.name) return AiMode.api;
  if (value == AiMode.local.name) {
    _logger.w('Found invalid local mode for post-processing');
    return AiMode.local;
  }
  return AiMode.cloud;
}

Future<void> setPostProcessingMode(AiMode mode) async {
  if (mode == AiMode.local) {
    throw ArgumentError.value(
      mode,
      'mode',
      'Post-processing only supports cloud or api modes.',
    );
  }
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
  await prefs.setString(
    _kApiKeys,
    jsonEncode(keys.map((k) => k.toJson()).toList()),
  );
}

Future<ApiKey> createApiKey({
  required String name,
  required ApiKeyProvider provider,
  required String keyValue,
  String? baseUrl,
  String? transcriptionModel,
  String? postProcessingModel,
  String? azureRegion,
}) async {
  final keys = await loadApiKeys();
  final id = const Uuid().v4();
  final suffix = keyValue.length >= 4
      ? keyValue.substring(keyValue.length - 4)
      : keyValue;
  final now = DateTime.now().toUtc().toIso8601String();

  final apiKey = ApiKey(
    id: id,
    name: name,
    provider: provider,
    keySuffix: suffix,
    createdAt: now,
    baseUrl: baseUrl,
    transcriptionModel: transcriptionModel,
    postProcessingModel: postProcessingModel,
    azureRegion: azureRegion,
  );

  await _secureStorage.write(key: '$_secureKeyPrefix$id', value: keyValue);
  keys.add(apiKey);
  await _saveApiKeyList(keys);
  return apiKey;
}

Future<ApiKey> updateApiKey({
  required String id,
  required String name,
  required ApiKeyProvider provider,
  String? keyValue,
  String? baseUrl,
  String? transcriptionModel,
  String? postProcessingModel,
  String? azureRegion,
}) async {
  final keys = await loadApiKeys();
  final index = keys.indexWhere((k) => k.id == id);
  if (index == -1) throw Exception('API key not found');

  final existing = keys[index];
  String keySuffix = existing.keySuffix;

  if (keyValue != null && keyValue.isNotEmpty) {
    keySuffix = keyValue.length >= 4
        ? keyValue.substring(keyValue.length - 4)
        : keyValue;
    await _secureStorage.write(key: '$_secureKeyPrefix$id', value: keyValue);
  }

  final updated = ApiKey(
    id: id,
    name: name,
    provider: provider,
    keySuffix: keySuffix,
    createdAt: existing.createdAt,
    baseUrl: baseUrl,
    transcriptionModel: transcriptionModel,
    postProcessingModel: postProcessingModel,
    azureRegion: azureRegion,
  );

  keys[index] = updated;
  await _saveApiKeyList(keys);
  await syncKeyboardAiSettings();
  return updated;
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

Future<List<LocalTranscriptionModel>> listLocalTranscriptionModels() {
  return channel_utils.listLocalTranscriptionModels().then((models) {
    final order = <String, int>{};
    for (var i = 0; i < LocalTranscriptionModel.supportedSlugs.length; i++) {
      order[LocalTranscriptionModel.supportedSlugs[i]] = i;
    }

    final sorted = [...models];
    sorted.sort((a, b) {
      final aOrder = order[a.slug] ?? order.length;
      final bOrder = order[b.slug] ?? order.length;
      return aOrder.compareTo(bOrder);
    });
    return sorted;
  });
}

bool isLocalTranscriptionBridgeAvailable() {
  return channel_utils.canSyncKeyboardBridge;
}

Future<void> downloadLocalTranscriptionModel(String slug) {
  return channel_utils.downloadLocalTranscriptionModel(slug);
}

Future<bool> _isSelectedLocalTranscriptionModel(String slug) async {
  final models = await listLocalTranscriptionModels();
  return models.where((model) => model.slug == slug).firstOrNull?.selected ==
      true;
}

Future<LocalTranscriptionModel?> _firstSelectableLocalTranscriptionModel() async {
  final models = await listLocalTranscriptionModels();
  return models.where((model) => model.downloaded && model.valid).firstOrNull;
}

Future<void> deleteLocalTranscriptionModel(String slug) async {
  final wasSelected = await _isSelectedLocalTranscriptionModel(slug);
  final didDelete = await channel_utils.deleteLocalTranscriptionModel(slug);
  if (!didDelete) return;

  if (wasSelected) {
    final fallbackModel = await _firstSelectableLocalTranscriptionModel();
    if (fallbackModel != null) {
      await channel_utils.selectLocalTranscriptionModel(fallbackModel.slug);
    }

    // Keep local transcription mode after selecting a fallback model.
    await _persistTranscriptionMode(AiMode.local);
  }

  await syncKeyboardAiSettings();
}

Future<bool> selectLocalTranscriptionModel(String slug) async {
  final didSelect = await channel_utils.selectLocalTranscriptionModel(slug);
  if (!didSelect) return false;

  await _persistTranscriptionMode(AiMode.local);
  await syncKeyboardAiSettings();
  return true;
}

bool shouldClearTranscriptionModelForSync({
  required AiMode transcriptionMode,
  required String? transcriptionModel,
}) {
  return transcriptionMode == AiMode.local && transcriptionModel == null;
}

Future<void> syncKeyboardAiSettings() async {
  try {
    final transcriptionMode = await getTranscriptionMode();
    final storedPostProcessingMode = await getPostProcessingMode();
    final postProcessingMode = postProcessingModeForSync(
      storedPostProcessingMode,
    );

    String? transcriptionProvider;
    String? transcriptionApiKey;
    String? transcriptionBaseUrl;
    String? transcriptionModel;
    String? transcriptionAzureRegion;
    String? postProcessingProvider;
    String? postProcessingApiKey;
    String? postProcessingBaseUrl;
    String? postProcessingModel;

    if (transcriptionMode == AiMode.local) {
      final localModels = await listLocalTranscriptionModels();
      transcriptionModel = localModels
          .where((m) => m.selected)
          .firstOrNull
          ?.slug;
    } else if (transcriptionMode == AiMode.api) {
      final keyId = await getSelectedTranscriptionKeyId();
      if (keyId != null) {
        final keys = await loadApiKeys();
        final key = keys.where((k) => k.id == keyId).firstOrNull;
        if (key != null) {
          transcriptionProvider = key.provider.serializedName;
          transcriptionApiKey = await getApiKeyValue(keyId);
          transcriptionBaseUrl = key.baseUrl;
          transcriptionModel = key.transcriptionModel;
          transcriptionAzureRegion = key.azureRegion;
        }
      }
    }

    if (postProcessingMode == AiMode.api) {
      final keyId = await getSelectedPostProcessingKeyId();
      if (keyId != null) {
        final keys = await loadApiKeys();
        final key = keys.where((k) => k.id == keyId).firstOrNull;
        if (key != null) {
          postProcessingProvider = key.provider.serializedName;
          postProcessingApiKey = await getApiKeyValue(keyId);
          postProcessingBaseUrl = key.baseUrl;
          postProcessingModel = key.postProcessingModel;
        }
      }
    }

    await channel_utils.syncKeyboardAiConfig(
      transcriptionMode: transcriptionMode.name,
      postProcessingMode: postProcessingMode.name,
      transcriptionProvider: transcriptionProvider,
      transcriptionApiKey: transcriptionApiKey,
      transcriptionBaseUrl: transcriptionBaseUrl,
      transcriptionModel: transcriptionModel,
      clearTranscriptionModel: shouldClearTranscriptionModelForSync(
        transcriptionMode: transcriptionMode,
        transcriptionModel: transcriptionModel,
      ),
      transcriptionAzureRegion: transcriptionAzureRegion,
      postProcessingProvider: postProcessingProvider,
      postProcessingApiKey: postProcessingApiKey,
      postProcessingBaseUrl: postProcessingBaseUrl,
      postProcessingModel: postProcessingModel,
    );
  } catch (e) {
    _logger.w('Failed to sync AI settings to keyboard', e);
  }
}
