import 'dart:io' show Platform;

import 'package:app/api/api_token_api.dart';
import 'package:app/flavor.dart';
import 'package:app/utils/log_utils.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';

final _logger = createNamedLogger('channel_utils');

const _sharedChannel = MethodChannel('com.voquill.app/shared');

Future<void> syncKeyboardAuth() async {
  if (!Platform.isIOS && !Platform.isAndroid) return;

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
      functionUrl =
          'https://us-central1-$projectId.cloudfunctions.net/handler';
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
  if (!Platform.isIOS && !Platform.isAndroid) return;
  _sharedChannel.invokeMethod('clearKeyboardAuth').catchError((e) {
    _logger.w('Failed to clear keyboard auth', e);
  });
}
