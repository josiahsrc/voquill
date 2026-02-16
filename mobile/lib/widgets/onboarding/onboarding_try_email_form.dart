import 'package:app/actions/onboarding_actions.dart';
import 'package:app/actions/snackbar_actions.dart';
import 'package:app/actions/styles_actions.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:app/widgets/common/app_button.dart';
import 'package:app/widgets/common/try_email_form.dart';
import 'package:flutter/material.dart';

class OnboardingTryEmailForm extends StatefulWidget {
  const OnboardingTryEmailForm({super.key});

  @override
  State<OnboardingTryEmailForm> createState() => _OnboardingTryEmailFormState();
}

class _OnboardingTryEmailFormState extends State<OnboardingTryEmailForm> {
  @override
  void initState() {
    super.initState();
    selectTone(emailToneId);
  }

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
    final submitting = useAppStore().select(
      context,
      (s) => s.onboarding.submitting,
    );

    return TryEmailForm(
      action: AppButton.filled(
        onPressed: _handleFinish,
        loading: submitting,
        child: const Text('Finish'),
      ),
    );
  }
}
