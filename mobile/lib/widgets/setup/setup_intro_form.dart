import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:app/widgets/setup/setup_microphone_form.dart';
import 'package:flutter/material.dart';

class SetupIntroForm extends StatelessWidget {
  const SetupIntroForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();
    final theme = Theme.of(context);

    return OnboardingFormLayout(
      actions: [
        FilledButton(
          onPressed: () => presenter.pushPage<SetupMicrophoneForm>(),
          child: const Text('Get Started'),
        ),
      ],
      child: OnboardingBody(
        title: const Text('Permissions needed'),
        description: const Text(
          'Voquill needs a couple of permissions to work on your phone.',
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.security,
                  size: 56,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'We\'ll walk you through granting microphone and keyboard access.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
