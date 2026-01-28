import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:app/widgets/onboarding/try_email_form.dart';
import 'package:flutter/material.dart';

class TryDiscordForm extends StatelessWidget {
  const TryDiscordForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();
    final theme = Theme.of(context);

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [
        FilledButton(
          onPressed: () => presenter.pushPage<TryEmailForm>(),
          child: const Text('Continue'),
        ),
      ],
      child: OnboardingBody(
        title: const Text('Try out dictation'),
        description: const Text(
          'Tap the text field and use the microphone button to dictate.',
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF313338),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: const BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: Color(0xFF1E1F22)),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.discord,
                          color: Colors.white,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Discord',
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: const Color(0xFFF2F3F5),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: const BoxDecoration(
                                color: Color(0xFF5865F2),
                                shape: BoxShape.circle,
                              ),
                              child: const Center(
                                child: Text(
                                  'J',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        'Jordan',
                                        style:
                                            theme.textTheme.bodyMedium?.copyWith(
                                          color: const Color(0xFFF2F3F5),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Today at 10:32 AM',
                                        style:
                                            theme.textTheme.bodySmall?.copyWith(
                                          color: const Color(0xFF949BA4),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "What's your favorite breakfast?",
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: const Color(0xFFDBDEE1),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          maxLines: 2,
                          cursorColor: const Color(0xFF5865F2),
                          decoration: InputDecoration(
                            hintText: 'Bagels are the breakfast of champions.',
                            hintStyle: const TextStyle(color: Color(0xFF949BA4)),
                            filled: true,
                            fillColor: const Color(0xFF383A40),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF5865F2),
                                width: 2,
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF5865F2),
                                width: 2,
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF5865F2),
                                width: 2,
                              ),
                            ),
                          ),
                          style: const TextStyle(color: Color(0xFFDBDEE1)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
