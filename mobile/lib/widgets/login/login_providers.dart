import 'package:app/actions/auth_actions.dart';
import 'package:app/actions/snackbar_actions.dart';
import 'package:app/widgets/common/app_button.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class LoginProviders extends StatefulWidget {
  const LoginProviders({super.key, this.onSuccess});

  final VoidCallback? onSuccess;

  @override
  State<LoginProviders> createState() => _LoginProvidersState();
}

class _LoginProvidersState extends State<LoginProviders> {
  bool _loading = false;

  Future<void> _handleSignIn(Future<bool> Function() signIn) async {
    if (_loading) return;
    setState(() => _loading = true);

    try {
      final success = await signIn();
      if (!success || !mounted) return;
      widget.onSuccess?.call();
    } catch (e) {
      if (mounted) {
        showErrorSnackbar('Sign in failed. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppButton.filled(
          onPressed: () => _handleSignIn(signInWithGoogle),
          loading: _loading,
          icon: const FaIcon(FontAwesomeIcons.google, size: 18),
          child: const Text('Continue with Google'),
        ),
        const SizedBox(height: 12),
        AppButton.outlined(
          onPressed: () => _handleSignIn(signInWithApple),
          loading: _loading,
          icon: const FaIcon(FontAwesomeIcons.apple, size: 20),
          child: const Text('Continue with Apple'),
        ),
      ],
    );
  }
}
