import 'package:app/db/api_key_db.dart';
import 'package:app/model/common_model.dart';
import 'package:app/state/api_key_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/log_utils.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

final _logger = createNamedLogger('api_key_actions');

const _transcriptionDb = ApiKeyDb(ApiKeyTable.transcription);
const _postProcessingDb = ApiKeyDb(ApiKeyTable.postProcessing);

const _kTranscriptionMode = 'transcription_mode';
const _kPostProcessingMode = 'post_processing_mode';
const _kSelectedTranscriptionApiKeyId = 'selected_transcription_api_key_id';
const _kSelectedPostProcessingApiKeyId = 'selected_post_processing_api_key_id';

const _uuid = Uuid();

Future<void> loadTranscriptionApiKeys() async {
  try {
    produceAppState((draft) {
      draft.apiKeys.transcriptionApiKeysStatus = ActionStatus.loading;
    });

    final keys = await _transcriptionDb.listAll();

    produceAppState((draft) {
      draft.apiKeys.transcriptionApiKeys = keys;
      draft.apiKeys.transcriptionApiKeysStatus = ActionStatus.success;
    });
  } catch (e) {
    _logger.w('Failed to load transcription API keys', e);
    produceAppState((draft) {
      draft.apiKeys.transcriptionApiKeysStatus = ActionStatus.error;
    });
  }
}

Future<void> loadPostProcessingApiKeys() async {
  try {
    produceAppState((draft) {
      draft.apiKeys.postProcessingApiKeysStatus = ActionStatus.loading;
    });

    final keys = await _postProcessingDb.listAll();

    produceAppState((draft) {
      draft.apiKeys.postProcessingApiKeys = keys;
      draft.apiKeys.postProcessingApiKeysStatus = ActionStatus.success;
    });
  } catch (e) {
    _logger.w('Failed to load post-processing API keys', e);
    produceAppState((draft) {
      draft.apiKeys.postProcessingApiKeysStatus = ActionStatus.error;
    });
  }
}

Future<void> createTranscriptionApiKey({
  required String name,
  required String apiKey,
  String? baseUrl,
  String? model,
}) async {
  final entry = await _transcriptionDb.create(
    id: _uuid.v4(),
    name: name,
    provider: 'openai-compatible',
    apiKey: apiKey,
    baseUrl: baseUrl,
    model: model,
  );

  produceAppState((draft) {
    draft.apiKeys.transcriptionApiKeys = [
      entry,
      ...getAppState().apiKeys.transcriptionApiKeys,
    ];
  });
}

Future<void> createPostProcessingApiKey({
  required String name,
  required String apiKey,
  String? baseUrl,
  String? model,
}) async {
  final entry = await _postProcessingDb.create(
    id: _uuid.v4(),
    name: name,
    provider: 'openai-compatible',
    apiKey: apiKey,
    baseUrl: baseUrl,
    model: model,
  );

  produceAppState((draft) {
    draft.apiKeys.postProcessingApiKeys = [
      entry,
      ...getAppState().apiKeys.postProcessingApiKeys,
    ];
  });
}

Future<void> deleteTranscriptionApiKey(String id) async {
  await _transcriptionDb.delete(id);

  produceAppState((draft) {
    draft.apiKeys.transcriptionApiKeys = getAppState()
        .apiKeys
        .transcriptionApiKeys
        .where((k) => k.id != id)
        .toList();
    if (draft.apiKeys.selectedTranscriptionApiKeyId == id) {
      draft.apiKeys.selectedTranscriptionApiKeyId = null;
    }
  });

  final prefs = await SharedPreferences.getInstance();
  final currentId = prefs.getString(_kSelectedTranscriptionApiKeyId);
  if (currentId == id) {
    await prefs.remove(_kSelectedTranscriptionApiKeyId);
  }
}

Future<void> deletePostProcessingApiKey(String id) async {
  await _postProcessingDb.delete(id);

  produceAppState((draft) {
    draft.apiKeys.postProcessingApiKeys = getAppState()
        .apiKeys
        .postProcessingApiKeys
        .where((k) => k.id != id)
        .toList();
    if (draft.apiKeys.selectedPostProcessingApiKeyId == id) {
      draft.apiKeys.selectedPostProcessingApiKeyId = null;
    }
  });

  final prefs = await SharedPreferences.getInstance();
  final currentId = prefs.getString(_kSelectedPostProcessingApiKeyId);
  if (currentId == id) {
    await prefs.remove(_kSelectedPostProcessingApiKeyId);
  }
}

Future<void> setTranscriptionMode(TranscriptionMode mode) async {
  produceAppState((draft) {
    draft.apiKeys.transcriptionMode = mode;
  });

  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_kTranscriptionMode, mode.name);
}

Future<void> setPostProcessingMode(PostProcessingMode mode) async {
  produceAppState((draft) {
    draft.apiKeys.postProcessingMode = mode;
  });

  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_kPostProcessingMode, mode.name);
}

Future<void> selectTranscriptionApiKey(String? id) async {
  produceAppState((draft) {
    draft.apiKeys.selectedTranscriptionApiKeyId = id;
  });

  final prefs = await SharedPreferences.getInstance();
  if (id != null) {
    await prefs.setString(_kSelectedTranscriptionApiKeyId, id);
  } else {
    await prefs.remove(_kSelectedTranscriptionApiKeyId);
  }
}

Future<void> selectPostProcessingApiKey(String? id) async {
  produceAppState((draft) {
    draft.apiKeys.selectedPostProcessingApiKeyId = id;
  });

  final prefs = await SharedPreferences.getInstance();
  if (id != null) {
    await prefs.setString(_kSelectedPostProcessingApiKeyId, id);
  } else {
    await prefs.remove(_kSelectedPostProcessingApiKeyId);
  }
}

Future<void> loadApiKeyPreferences() async {
  try {
    final prefs = await SharedPreferences.getInstance();

    final transcriptionModeStr = prefs.getString(_kTranscriptionMode);
    final postProcessingModeStr = prefs.getString(_kPostProcessingMode);
    final selectedTranscriptionId = prefs.getString(
      _kSelectedTranscriptionApiKeyId,
    );
    final selectedPostProcessingId = prefs.getString(
      _kSelectedPostProcessingApiKeyId,
    );

    produceAppState((draft) {
      if (transcriptionModeStr != null) {
        draft.apiKeys.transcriptionMode = TranscriptionMode.values.firstWhere(
          (m) => m.name == transcriptionModeStr,
          orElse: () => TranscriptionMode.cloud,
        );
      }
      if (postProcessingModeStr != null) {
        draft.apiKeys.postProcessingMode =
            PostProcessingMode.values.firstWhere(
              (m) => m.name == postProcessingModeStr,
              orElse: () => PostProcessingMode.cloud,
            );
      }
      draft.apiKeys.selectedTranscriptionApiKeyId = selectedTranscriptionId;
      draft.apiKeys.selectedPostProcessingApiKeyId = selectedPostProcessingId;
    });
  } catch (e) {
    _logger.w('Failed to load API key preferences', e);
  }
}

Future<String> revealTranscriptionApiKey(String id) async {
  return _transcriptionDb.revealKey(id);
}

Future<String> revealPostProcessingApiKey(String id) async {
  return _postProcessingDb.revealKey(id);
}
