import 'dart:io' show Platform;

import 'package:app/api/api_token_api.dart';
import 'package:app/flavor.dart';
import 'package:app/model/tone_model.dart';
import 'package:app/utils/log_utils.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';

final _logger = createNamedLogger('channel_utils');

const _sharedChannel = MethodChannel('com.voquill.mobile/shared');

bool get _canSync => Platform.isIOS || Platform.isAndroid;

Future<void> syncKeyboardAuth() async {
  if (!_canSync) {
    return;
  }

  try {
    final output = await CreateApiTokenApi().call(null);
    final projectId = Firebase.app().options.projectId;
    final apiKey = Firebase.app().options.apiKey;

    final String functionUrl;
    final String authUrl;
    if (Flavor.current.isEmulators) {
      final host = Flavor.current.emulatorHost;
      functionUrl = 'http://$host:5001/$projectId/us-central1/handler';
      authUrl = 'http://$host:9099/identitytoolkit.googleapis.com';
    } else {
      functionUrl = 'https://us-central1-$projectId.cloudfunctions.net/handler';
      authUrl = 'https://identitytoolkit.googleapis.com';
    }

    await _sharedChannel.invokeMethod('setKeyboardAuth', {
      'apiRefreshToken': output.apiRefreshToken,
      'apiKey': apiKey,
      'functionUrl': functionUrl,
      'authUrl': authUrl,
    });
  } catch (e) {
    _logger.w('Failed to sync keyboard auth', e);
  }
}

void clearKeyboardAuth() {
  if (!_canSync) {
    return;
  }

  _sharedChannel.invokeMethod('clearKeyboardAuth').catchError((e) {
    _logger.w('Failed to clear keyboard auth', e);
  });
}

Future<void> syncKeyboardTones({
  required String selectedToneId,
  required List<String> activeToneIds,
  required Map<String, SharedTone> toneById,
}) async {
  if (!_canSync) {
    return;
  }

  try {
    final toneMap = <String, Map<String, String>>{};
    for (final entry in toneById.entries) {
      toneMap[entry.key] = entry.value.toMap();
    }

    await _sharedChannel.invokeMethod('setKeyboardTones', {
      'selectedToneId': selectedToneId,
      'activeToneIds': activeToneIds,
      'toneById': toneMap,
    });
  } catch (e) {
    _logger.w('Failed to sync keyboard tones', e);
  }
}

Future<void> syncKeyboardUser({
  required String userName,
  required String dictationLanguage,
}) async {
  if (!_canSync) {
    return;
  }

  try {
    await _sharedChannel.invokeMethod('setKeyboardUser', {
      'userName': userName,
      'dictationLanguage': dictationLanguage,
    });
  } catch (e) {
    _logger.w('Failed to sync keyboard user', e);
  }
}

Future<void> syncKeyboardDictionary({
  required List<String> termIds,
  required Map<String, SharedTerm> termById,
}) async {
  if (!_canSync) {
    return;
  }

  try {
    final termMap = <String, Map<String, dynamic>>{};
    for (final entry in termById.entries) {
      termMap[entry.key] = entry.value.toMap();
    }

    await _sharedChannel.invokeMethod('setKeyboardDictionary', {
      'termIds': termIds,
      'termById': termMap,
    });
  } catch (e) {
    _logger.w('Failed to sync keyboard dictionary', e);
  }
}

Future<void> syncKeyboardDictationLanguages({
  required List<String> languages,
  required String activeLanguage,
}) async {
  if (!_canSync) {
    return;
  }

  try {
    await _sharedChannel.invokeMethod('setDictationLanguages', {
      'languages': languages,
    });
    await _sharedChannel.invokeMethod('setActiveDictationLanguage', {
      'language': activeLanguage,
    });
  } catch (e) {
    _logger.w('Failed to sync keyboard dictation languages', e);
  }
}
