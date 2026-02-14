import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/keyboard_access_form.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class MicrophoneAccessForm extends StatelessWidget {
  const MicrophoneAccessForm({super.key});

  Future<void> _requestMicrophoneAccess(BuildContext context) async {
    final presenter = context.presenter();
    final status = await Permission.microphone.request();
    if (!context.mounted) {
      return;
    }

    if (status.isGranted) {
      presenter.pushPage<KeyboardAccessForm>();
    } else if (status.isPermanentlyDenied) {
      openAppSettings();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [
        FilledButton(
          onPressed: () => _requestMicrophoneAccess(context),
          child: const Text('Enable Microphone'),
        ),
      ],
      child: OnboardingBody(
        title: const Text('Microphone access'),
        description: const Text(
          'Voquill needs access to your microphone to transcribe your voice.',
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
                  Icons.mic,
                  size: 56,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Tap the button below to grant microphone access.',
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
