import 'dart:io' show Platform;

import 'package:app/actions/auth_actions.dart';
import 'package:app/actions/onboarding_actions.dart';
import 'package:app/actions/snackbar_actions.dart';
import 'package:app/state/app_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_dialog.dart';
import 'package:app/widgets/common/declarative_text_field.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

final _logger = createNamedLogger('delete_account_dialog');

const _kConfirmText = 'delete';

class DeleteAccountDialog extends StatefulWidget {
  const DeleteAccountDialog({super.key});

  @override
  State<DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<DeleteAccountDialog> {
  String _confirmation = '';
  bool _deleting = false;

  bool get _isDeleteEnabled =>
      _confirmation.toLowerCase() == _kConfirmText && !_deleting;

  Future<void> _reauthenticate(User user) async {
    final providerIds = user.providerData.map((p) => p.providerId).toSet();

    if (providerIds.contains('apple.com') && Platform.isIOS) {
      await user.reauthenticateWithProvider(AppleAuthProvider());
    } else if (providerIds.contains('google.com')) {
      final googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) throw Exception('Google re-auth cancelled');
      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      await user.reauthenticateWithCredential(credential);
    } else if (providerIds.contains('password')) {
      // Email/password users will hit the catch block with a helpful message
      throw FirebaseAuthException(
        code: 'requires-recent-login',
        message: 'Please sign out and sign back in, then try again.',
      );
    }
  }

  Future<void> _handleDelete() async {
    if (!_isDeleteEnabled) return;

    setState(() => _deleting = true);

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception('No user signed in');

      try {
        await user.delete();
      } on FirebaseAuthException catch (e) {
        if (e.code == 'requires-recent-login') {
          await _reauthenticate(user);
          await user.delete();
        } else {
          rethrow;
        }
      }

      await signOut();
      await clearOnboardingProgress();
      produceAppState((_) => const AppState());
      if (mounted) {
        Navigator.of(context).pop();
        showSnackbar('Your account has been deleted.');
      }
    } catch (e) {
      _logger.e('Failed to delete account', e);
      if (mounted) {
        setState(() => _deleting = false);
        showErrorSnackbar(
          'Failed to delete account. Please sign out, sign back in, and try again.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final userEmail = getAppState().auth?.email;

    return AppDialog(
      title: Text(
        'Delete Account',
        style: TextStyle(color: theme.colorScheme.error),
      ),
      content: Padding(
        padding: Theming.padding.onlyHorizontal(),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This action cannot be undone. All your data will be permanently deleted, and any active subscriptions will be cancelled.',
            ),
            if (userEmail != null) ...[
              const SizedBox(height: 16),
              Text(
                'Account: $userEmail',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Type "$_kConfirmText" to confirm:',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            DeclarativeTextField(
              value: _confirmation,
              onChanged: (value) => setState(() => _confirmation = value),
              autocorrect: false,
              enableSuggestions: false,
              decoration: const InputDecoration(hintText: _kConfirmText),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _deleting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: _isDeleteEnabled ? _handleDelete : null,
          style: FilledButton.styleFrom(
            backgroundColor: theme.colorScheme.error,
          ),
          child: _deleting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Delete Account'),
        ),
      ],
    );
  }
}
