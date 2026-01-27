import 'package:app/widgets/common/declarative_text_field.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:app/widgets/onboarding/try_it_out_form.dart';
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
          onPressed: () => presenter.pushPage<TryItOutForm>(),
          child: const Text('Next'),
        ),
      ],
      child: OnboardingBody(
        title: const Text('About you'),
        description: const Text(
          'This is where we would collect information about you.',
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 8,
          children: [
            DeclarativeTextField(value: '', onChanged: (v) {}),
            DeclarativeTextField(value: '', onChanged: (v) {}),
            DeclarativeTextField(value: '', onChanged: (v) {}),
          ],
        ),
      ),
    );
  }
}
