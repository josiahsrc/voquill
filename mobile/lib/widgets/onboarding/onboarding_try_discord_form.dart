import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/common/try_discord_form.dart';
import 'package:app/widgets/onboarding/onboarding_try_email_form.dart';
import 'package:flutter/material.dart';

class OnboardingTryDiscordForm extends StatelessWidget {
  const OnboardingTryDiscordForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();

    return TryDiscordForm(
      action: FilledButton(
        onPressed: () => presenter.pushPage<OnboardingTryEmailForm>(),
        child: const Text('Continue'),
      ),
    );
  }
}
