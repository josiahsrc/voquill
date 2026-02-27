import 'dart:io' show Platform;

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
  String? _loadingProvider;

  Future<void> _handleSignIn(String provider, Future<bool> Function() signIn) async {
    if (_loadingProvider != null) return;
    setState(() => _loadingProvider = provider);

    try {
      final success = await signIn();
      if (!success || !mounted) return;
      widget.onSuccess?.call();
    } catch (e) {
      if (mounted) {
        showErrorSnackbar('Sign in failed. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _loadingProvider = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        AppButton.filled(
          onPressed: () => _handleSignIn('google', signInWithGoogle),
          loading: _loadingProvider == 'google',
          icon: const FaIcon(FontAwesomeIcons.google, size: 18),
          child: const Text('Continue with Google'),
        ),
        if (Platform.isIOS)
          AppButton.outlined(
            onPressed: () => _handleSignIn('apple', signInWithApple),
            loading: _loadingProvider == 'apple',
            icon: const FaIcon(FontAwesomeIcons.apple, size: 20),
            child: const Text('Continue with Apple'),
          ),
      ],
    );
  }
}
