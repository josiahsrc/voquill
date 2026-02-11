import 'package:app/actions/auth_actions.dart';
import 'package:app/flavor.dart';
import 'package:app/widgets/common/app_button.dart';
import 'package:app/widgets/common/declarative_text_field.dart';
import 'package:app/widgets/common/app_divider.dart';
import 'package:app/widgets/common/terms_notice.dart';
import 'package:app/widgets/login/login_providers.dart';
import 'package:flutter/material.dart';

enum LoginMode { signIn, signUp, resetPassword, passwordResetSent }

class LoginForm extends StatefulWidget {
  const LoginForm({
    super.key,
    this.onSuccess,
    this.hideModeSwitch = false,
    this.hideProviders = false,
    this.defaultMode = LoginMode.signUp,
  });

  final VoidCallback? onSuccess;
  final bool hideModeSwitch;
  final bool hideProviders;
  final LoginMode defaultMode;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  late LoginMode _mode = widget.defaultMode;
  String _email = '';
  String _password = '';
  String _confirmPassword = '';
  bool _loading = false;
  bool _hasSubmitted = false;
  String? _errorMessage;
  bool _showPassword = false;
  bool _showConfirmPassword = false;

  static final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  String? get _emailError {
    if (!_hasSubmitted || _email.isEmpty) return null;
    if (!_emailRegex.hasMatch(_email)) return 'Enter a valid email address';
    return null;
  }

  String? get _passwordError {
    if (!_hasSubmitted || _password.isEmpty) return null;
    if (_password.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  String? get _confirmPasswordError {
    if (!_hasSubmitted || _confirmPassword.isEmpty) return null;
    if (_confirmPassword != _password) return 'Passwords do not match';
    return null;
  }

  bool get _canSubmitSignUp =>
      _emailRegex.hasMatch(_email) &&
      _password.length >= 6 &&
      _confirmPassword == _password;

  bool get _canSubmitSignIn =>
      _emailRegex.hasMatch(_email) && _password.isNotEmpty;

  bool get _canSubmitReset => _emailRegex.hasMatch(_email);

  @override
  void initState() {
    if (Flavor.current.isEmulators) {
      _email = 'emulator@voquill.com';
      _password = 'password';
      _confirmPassword = 'password';
    }

    super.initState();
  }

  void _setMode(LoginMode mode) {
    setState(() {
      _mode = mode;
      _loading = false;
      _hasSubmitted = false;
      _errorMessage = null;
      _showPassword = false;
      _showConfirmPassword = false;
    });
  }

  Future<void> _submitSignUp() async {
    setState(() {
      _hasSubmitted = true;
      _errorMessage = null;
    });
    if (!_canSubmitSignUp) return;

    setState(() => _loading = true);
    try {
      await signUpWithEmail(_email, _password);
      if (mounted) widget.onSuccess?.call();
    } catch (e) {
      if (mounted) {
        setState(
          () => _errorMessage = 'An error occurred while creating account.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitSignIn() async {
    setState(() {
      _hasSubmitted = true;
      _errorMessage = null;
    });
    if (!_canSubmitSignIn) return;

    setState(() => _loading = true);
    try {
      await signInWithEmail(_email, _password);
      if (mounted) widget.onSuccess?.call();
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'An error occurred while signing in.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitReset() async {
    setState(() {
      _hasSubmitted = true;
      _errorMessage = null;
    });
    if (!_canSubmitReset) return;

    setState(() => _loading = true);
    try {
      await sendPasswordReset(_email);
    } catch (_) {}
    if (mounted) _setMode(LoginMode.passwordResetSent);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(switch (_mode) {
          LoginMode.signIn => 'Sign in',
          LoginMode.signUp => 'Sign up',
          LoginMode.resetPassword => 'Reset password',
          LoginMode.passwordResetSent => 'Email sent',
        }, style: theme.textTheme.headlineSmall),
        const SizedBox(height: 16),
        if (!widget.hideProviders &&
            (_mode == LoginMode.signIn || _mode == LoginMode.signUp)) ...[
          LoginProviders(onSuccess: widget.onSuccess),
          const SizedBox(height: 16),
          const AppDivider(child: Text('or')),
          const SizedBox(height: 16),
        ],
        AnimatedSize(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: Alignment.topCenter,
          child: switch (_mode) {
            LoginMode.signUp => _buildSignUpFields(),
            LoginMode.signIn => _buildSignInFields(),
            LoginMode.resetPassword => _buildResetFields(),
            LoginMode.passwordResetSent => _buildResetSentMessage(theme),
          },
        ),
        if (_errorMessage != null) ...[
          const SizedBox(height: 12),
          Text(
            _errorMessage!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.error,
            ),
          ),
        ],
        if (_mode == LoginMode.signIn || _mode == LoginMode.signUp) ...[
          const SizedBox(height: 16),
          const TermsNotice(),
        ],
      ],
    );
  }

  Widget _buildSignUpFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DeclarativeTextField(
          value: _email,
          onChanged: (v) => setState(() => _email = v),
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(
            labelText: 'Email',
            errorText: _emailError,
          ),
        ),
        const SizedBox(height: 12),
        DeclarativeTextField(
          value: _password,
          onChanged: (v) => setState(() => _password = v),
          obscureText: !_showPassword,
          decoration: InputDecoration(
            labelText: 'Password',
            errorText: _passwordError,
            suffixIcon: IconButton(
              icon: Icon(
                _showPassword ? Icons.visibility_off : Icons.visibility,
              ),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            ),
          ),
        ),
        const SizedBox(height: 12),
        DeclarativeTextField(
          value: _confirmPassword,
          onChanged: (v) => setState(() => _confirmPassword = v),
          obscureText: !_showConfirmPassword,
          decoration: InputDecoration(
            labelText: 'Confirm password',
            errorText: _confirmPasswordError,
            suffixIcon: IconButton(
              icon: Icon(
                _showConfirmPassword ? Icons.visibility_off : Icons.visibility,
              ),
              onPressed: () =>
                  setState(() => _showConfirmPassword = !_showConfirmPassword),
            ),
          ),
        ),
        const SizedBox(height: 16),
        AppButton.filled(
          onPressed: _submitSignUp,
          loading: _loading,
          child: const Text('Create account'),
        ),
        if (!widget.hideModeSwitch) ...[
          const SizedBox(height: 12),
          _ModeLink(
            prefix: 'Already have an account? ',
            label: 'Log in',
            onTap: () => _setMode(LoginMode.signIn),
          ),
        ],
      ],
    );
  }

  Widget _buildSignInFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DeclarativeTextField(
          value: _email,
          onChanged: (v) => setState(() => _email = v),
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(
            labelText: 'Email',
            errorText: _emailError,
          ),
        ),
        const SizedBox(height: 12),
        DeclarativeTextField(
          value: _password,
          onChanged: (v) => setState(() => _password = v),
          obscureText: !_showPassword,
          decoration: InputDecoration(
            labelText: 'Password',
            suffixIcon: IconButton(
              icon: Icon(
                _showPassword ? Icons.visibility_off : Icons.visibility,
              ),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            ),
          ),
        ),
        const SizedBox(height: 16),
        AppButton.filled(
          onPressed: _submitSignIn,
          loading: _loading,
          child: const Text('Log in'),
        ),
        if (!widget.hideModeSwitch) ...[
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _ModeLink(
                label: 'Forgot?',
                onTap: () => _setMode(LoginMode.resetPassword),
              ),
              _ModeLink(
                label: 'Create account',
                onTap: () => _setMode(LoginMode.signUp),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildResetFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text("Enter your email and we'll send a reset link."),
        const SizedBox(height: 12),
        DeclarativeTextField(
          value: _email,
          onChanged: (v) => setState(() => _email = v),
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(
            labelText: 'Email',
            errorText: _emailError,
          ),
        ),
        const SizedBox(height: 16),
        AppButton.filled(
          onPressed: _submitReset,
          loading: _loading,
          child: const Text('Send reset link'),
        ),
        const SizedBox(height: 12),
        _ModeLink(
          icon: Icons.arrow_back,
          label: 'Back',
          onTap: () => _setMode(LoginMode.signIn),
        ),
      ],
    );
  }

  Widget _buildResetSentMessage(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Check your inbox for a password reset link.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        _ModeLink(
          icon: Icons.arrow_back,
          label: 'Back to sign in',
          onTap: () => _setMode(LoginMode.signIn),
        ),
      ],
    );
  }
}

class _ModeLink extends StatelessWidget {
  const _ModeLink({
    this.prefix,
    required this.label,
    required this.onTap,
    this.icon,
  });

  final String? prefix;
  final String label;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: theme.colorScheme.primary),
            const SizedBox(width: 4),
          ],
          Text.rich(
            TextSpan(
              children: [
                if (prefix != null)
                  TextSpan(
                    text: prefix,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                TextSpan(
                  text: label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
