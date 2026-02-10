import 'package:app/actions/auth_actions.dart';
import 'package:app/store/store.dart';
import 'package:app/widgets/common/app_button.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/common/terms_notice.dart';
import 'package:app/widgets/login/login_form.dart';
import 'package:app/widgets/login/login_providers.dart';
import 'package:app/widgets/onboarding/about_you_form.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CreateAccountForm extends StatelessWidget {
  const CreateAccountForm({super.key});

  void _advance(BuildContext context) {
    if (getAppState().isOnboarded) return;
    context.presenter().pushPage<AboutYouForm>();
  }

  void _handleEmailSignUp(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: LoginForm(
            hideModeSwitch: true,
            hideProviders: true,
            defaultMode: LoginMode.signUp,
            onSuccess: () => Navigator.of(dialogContext).pop(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = useAppStore().select(context, (s) => s.auth);
    final isLoggedIn = auth != null;
    final canPop = context.canPop();

    final layout = OnboardingFormLayout(
      backButton: canPop ? const MultiPageBackButton() : null,
      actions: [
        if (isLoggedIn)
          AppButton.filled(
            onPressed: () => _advance(context),
            child: const Text('Continue'),
          ),
      ],
      child: OnboardingBody(
        title: const Text('Create your account'),
        description: const Text(
          'Sign up to sync your data across devices and unlock all features.',
        ),
        child: isLoggedIn
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'You are signed in as ${auth.email ?? ''}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: GestureDetector(
                      onTap: signOut,
                      child: Text(
                        'Sign out',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                  const Spacer(),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  LoginProviders(onSuccess: () => _advance(context)),
                  const SizedBox(height: 12),
                  AppButton.outlined(
                    onPressed: () => _handleEmailSignUp(context),
                    icon: const Icon(Icons.email_outlined),
                    child: const Text('Sign up with email'),
                  ),
                  const Spacer(),
                  const TermsNotice(),
                ],
              ),
      ),
    );

    return StoreListener([
      useAppStore().listen((context, state) {
        if (state.isLoggedIn) _advance(context);
      }, condition: (a, b) => !a.isLoggedIn && b.isLoggedIn),
    ], child: layout);
  }
}
