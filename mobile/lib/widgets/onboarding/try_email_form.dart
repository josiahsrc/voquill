import 'package:app/actions/onboarding_actions.dart';
import 'package:app/actions/snackbar_actions.dart';
import 'package:app/store/store.dart';
import 'package:app/widgets/common/app_button.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';

class TryEmailForm extends StatefulWidget {
  const TryEmailForm({super.key});

  @override
  State<TryEmailForm> createState() => _TryEmailFormState();
}

class _TryEmailFormState extends State<TryEmailForm> {
  Future<void> _handleFinish() async {
    try {
      await finishOnboarding();
    } catch (e) {
      if (mounted) {
        showErrorSnackbar('Failed to complete setup. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final submitting =
        useAppStore().select(context, (s) => s.onboarding.submitting);

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [
        AppButton.filled(
          onPressed: _handleFinish,
          loading: submitting,
          child: const Text('Finish'),
        ),
      ],
      child: OnboardingBody(
        title: const Text('Now try an email'),
        description: const Text(
          'Dictate a short email. Voquill works great for longer-form content.',
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE1E2E6)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
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
                      color: Color(0xFFF5F5F5),
                      border: Border(
                        bottom: BorderSide(color: Color(0xFFE0E0E0)),
                      ),
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(8),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.email,
                          color: Color(0xFFD93025),
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Email',
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: const Color(0xFF202124),
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
                        _buildEmailHeader('To:', 'sarah@company.com', theme),
                        const Divider(height: 1, color: Color(0xFFE0E0E0)),
                        const SizedBox(height: 8),
                        _buildEmailHeader(
                          'Subject:',
                          'Great chatting yesterday! 🎉',
                          theme,
                        ),
                        const Divider(height: 1, color: Color(0xFFE0E0E0)),
                        const SizedBox(height: 12),
                        TextField(
                          maxLines: 7,
                          cursorColor: const Color(0xFF1A73E8),
                          decoration: InputDecoration(
                            hintText:
                                'Hey Bob,\n\nGreat meeting you yesterday! Looking forward to next steps.\n\nBest,\nAlex',
                            hintStyle: const TextStyle(
                              color: Color(0xFF5F6368),
                            ),
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF1A73E8),
                                width: 2,
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF1A73E8),
                                width: 2,
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF1A73E8),
                                width: 2,
                              ),
                            ),
                          ),
                          style: const TextStyle(color: Color(0xFF202124)),
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

  Widget _buildEmailHeader(String label, String value, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF5F6368),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF202124),
            ),
          ),
        ],
      ),
    );
  }
}
