import 'dart:async';
import 'dart:io' show Platform;

import 'package:app/api/api_token_api.dart';
import 'package:app/api/member_api.dart';
import 'package:app/api/user_api.dart';
import 'package:app/flavor.dart';
import 'package:app/model/auth_user_model.dart';
import 'package:app/model/common_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/log_utils.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';

final _logger = createNamedLogger('app_actions');

const _sharedChannel = MethodChannel('com.voquill.app/shared');

StreamSubscription<User?> listenToAuthChanges() {
  return FirebaseAuth.instance.authStateChanges().listen((firebaseUser) async {
    final currentAuth = getAppState().auth;
    final isInitial = getAppState().status.isLoading;

    if (firebaseUser != null) {
      if (currentAuth?.uid != firebaseUser.uid) {
        produceAppState((draft) {
          draft.auth = AuthUser(uid: firebaseUser.uid, email: firebaseUser.email);
        });
        await _loadCurrentUser();
      }
      _syncKeyboardAuth();
    } else {
      if (currentAuth != null) {
        produceAppState((draft) {
          draft.auth = null;
          draft.user = null;
        });
      }
      _clearKeyboardAuth();
    }

    if (isInitial) {
      produceAppState((draft) {
        draft.status = ActionStatus.success;
      });
    }
  });
}

Future<void> _syncKeyboardAuth() async {
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

void _clearKeyboardAuth() {
  if (!Platform.isIOS && !Platform.isAndroid) return;
  _sharedChannel.invokeMethod('clearKeyboardAuth').catchError((e) {
    _logger.w('Failed to clear keyboard auth', e);
  });
}

Future<void> _loadCurrentUser() async {
  try {
    final output = await GetMyUserApi().call(null);
    produceAppState((draft) {
      draft.user = output.user;
    });
  } catch (e) {
    _logger.w('Failed to load user (may not exist yet)', e);
  }
}

Future<void> tryInitializeMember() async {
  try {
    await TryInitializeMemberApi().call(null);
  } catch (e) {
    _logger.w('Failed to initialize member', e);
  }
}
