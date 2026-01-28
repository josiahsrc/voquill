import 'package:app/widgets/common/declarative_text_field.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/microphone_access_form.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';

class AboutYouForm extends StatelessWidget {
  const AboutYouForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [
        FilledButton(
          onPressed: () => presenter.pushPage<MicrophoneAccessForm>(),
          child: const Text('Next'),
        ),
      ],
      child: OnboardingBody(
        title: const Text('Tell us about yourself'),
        description: const Text(
          'Help us personalize your experience.',
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DeclarativeTextField(
              value: '',
              onChanged: (v) {},
              decoration: const InputDecoration(
                labelText: 'Name',
                hintText: 'Enter your name',
              ),
            ),
            const SizedBox(height: 16),
            DeclarativeTextField(
              value: '',
              onChanged: (v) {},
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'e.g. Software Engineer',
              ),
            ),
            const SizedBox(height: 16),
            DeclarativeTextField(
              value: '',
              onChanged: (v) {},
              decoration: const InputDecoration(
                labelText: 'Company',
                hintText: 'e.g. Acme Inc.',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
