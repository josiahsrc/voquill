import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:app/widgets/onboarding/pro_unlocked_form.dart';
import 'package:flutter/material.dart';

class KeyboardAccessForm extends StatelessWidget {
  const KeyboardAccessForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();
    final theme = Theme.of(context);

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [
        FilledButton(
          onPressed: () => presenter.pushPage<ProUnlockedForm>(),
          child: const Text('Open Settings'),
        ),
      ],
      child: OnboardingBody(
        title: const Text('Keyboard access'),
        description: const Text(
          'Add Voquill as a keyboard to use voice input in any app.',
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _StepItem(
              number: 1,
              title: 'Open Settings',
              description: 'Tap the button below to open keyboard settings.',
              theme: theme,
            ),
            const SizedBox(height: 16),
            _StepItem(
              number: 2,
              title: 'Add Voquill Keyboard',
              description: 'Find Voquill in the list and enable it.',
              theme: theme,
            ),
            const SizedBox(height: 16),
            _StepItem(
              number: 3,
              title: 'Allow Full Access',
              description: 'Grant full access for the best experience.',
              theme: theme,
            ),
          ],
        ),
      ),
    );
  }
}

class _StepItem extends StatelessWidget {
  const _StepItem({
    required this.number,
    required this.title,
    required this.description,
    required this.theme,
  });

  final int number;
  final String title;
  final String description;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$number',
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
