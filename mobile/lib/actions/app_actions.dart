import 'dart:async';

import 'package:app/api/member_api.dart';
import 'package:app/api/user_api.dart';
import 'package:app/model/auth_user_model.dart';
import 'package:app/model/common_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:firebase_auth/firebase_auth.dart';

final _logger = createNamedLogger('app_actions');

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
      syncKeyboardAuth();
    } else {
      if (currentAuth != null) {
        produceAppState((draft) {
          draft.auth = null;
          draft.user = null;
        });
      }
      clearKeyboardAuth();
    }

    if (isInitial) {
      produceAppState((draft) {
        draft.status = ActionStatus.success;
      });
    }
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
