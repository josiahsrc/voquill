import 'package:app/api/user_api.dart';
import 'package:app/model/auth_user_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/log_utils.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

final _logger = createNamedLogger('auth_actions');

Future<bool> signInWithGoogle() async {
  try {
    final googleUser = await GoogleSignIn().signIn();
    if (googleUser == null) return false;

    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );

    final userCred = await FirebaseAuth.instance.signInWithCredential(
      credential,
    );
    await _onSignedIn(userCred.user!.uid, email: userCred.user!.email);
    return true;
  } catch (e) {
    _logger.e('Google sign-in failed', e);
    rethrow;
  }
}

Future<bool> signInWithApple() async {
  try {
    final provider = AppleAuthProvider();
    final userCred = await FirebaseAuth.instance.signInWithProvider(provider);
    await _onSignedIn(userCred.user!.uid, email: userCred.user!.email);
    return true;
  } catch (e) {
    _logger.e('Apple sign-in failed', e);
    rethrow;
  }
}

Future<void> signUpWithEmail(String email, String password) async {
  try {
    final userCred = await FirebaseAuth.instance.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    await _onSignedIn(userCred.user!.uid, email: userCred.user!.email);
    try {
      await userCred.user!.sendEmailVerification();
    } catch (e) {
      _logger.w('Failed to send verification email', e);
    }
  } catch (e) {
    _logger.e('Email sign-up failed', e);
    rethrow;
  }
}

Future<void> signInWithEmail(String email, String password) async {
  try {
    final userCred = await FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    await _onSignedIn(userCred.user!.uid, email: userCred.user!.email);
  } catch (e) {
    _logger.e('Email sign-in failed', e);
    rethrow;
  }
}

Future<void> sendPasswordReset(String email) async {
  try {
    await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
  } catch (e) {
    _logger.e('Password reset failed', e);
    rethrow;
  }
}

Future<void> signOut() async {
  await FirebaseAuth.instance.signOut();
  await GoogleSignIn().signOut();
}

Future<void> _onSignedIn(String uid, {String? email}) async {
  produceAppState((draft) {
    draft.auth = AuthUser(uid: uid, email: email);
  });

  try {
    final output = await GetMyUserApi().call(null);
    if (output.user != null) {
      produceAppState((draft) {
        draft.user = output.user;
      });
    }
  } catch (e) {
    _logger.w('User not found (new user)', e);
  }
}
