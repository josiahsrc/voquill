import 'package:app/flavor.dart';
import 'package:app/utils/url_utils.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/about_you_form.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class CreateAccountForm extends StatelessWidget {
  const CreateAccountForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();
    final theme = Theme.of(context);

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: const [],
      child: OnboardingBody(
        title: const Text('Create your account'),
        description: const Text(
          'Sign up to sync your data across devices and unlock all features.',
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FilledButton.icon(
              onPressed: () => presenter.pushPage<AboutYouForm>(),
              icon: const FaIcon(FontAwesomeIcons.google, size: 18),
              label: const Text('Continue with Google'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => presenter.pushPage<AboutYouForm>(),
              icon: const Icon(Icons.email_outlined),
              label: const Text('Sign up with email'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => presenter.pushPage<AboutYouForm>(),
              icon: const FaIcon(FontAwesomeIcons.apple, size: 20),
              label: const Text('Sign up with Apple'),
            ),
            const Spacer(),
            Text.rich(
              TextSpan(
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                children: [
                  const TextSpan(text: 'By continuing, you agree to our '),
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: GestureDetector(
                      onTap: () => openUrl(Flavor.current.termsUrl),
                      child: Text(
                        'Terms of Service',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ),
                  const TextSpan(text: ' and '),
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: GestureDetector(
                      onTap: () => openUrl(Flavor.current.privacyUrl),
                      child: Text(
                        'Privacy Policy',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ),
                  const TextSpan(text: '.'),
                ],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
