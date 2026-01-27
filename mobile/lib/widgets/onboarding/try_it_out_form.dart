import 'package:app/widgets/common/declarative_text_field.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';

class TryItOutForm extends StatelessWidget {
  const TryItOutForm({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [FilledButton(onPressed: () {}, child: const Text('Next'))],
      child: OnboardingBody(
        title: const Text('Try it out'),
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
