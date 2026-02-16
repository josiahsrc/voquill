import 'package:app/actions/styles_actions.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/common/try_discord_form.dart';
import 'package:app/widgets/onboarding/onboarding_try_email_form.dart';
import 'package:flutter/material.dart';

class OnboardingTryDiscordForm extends StatefulWidget {
  const OnboardingTryDiscordForm({super.key});

  @override
  State<OnboardingTryDiscordForm> createState() =>
      _OnboardingTryDiscordFormState();
}

class _OnboardingTryDiscordFormState extends State<OnboardingTryDiscordForm> {
  @override
  void initState() {
    super.initState();
    selectTone(chatToneId);
  }

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();

    return TryDiscordForm(
      action: FilledButton(
        onPressed: () {
          presenter.pushPage<OnboardingTryEmailForm>();
        },
        child: const Text('Continue'),
      ),
    );
  }
}
