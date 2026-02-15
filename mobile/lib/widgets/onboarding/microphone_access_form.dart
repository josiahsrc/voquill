import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/keyboard_access_form.dart';
import 'package:app/widgets/permissions/microphone_permissions.dart';
import 'package:flutter/material.dart';

class MicrophoneAccessForm extends StatelessWidget {
  const MicrophoneAccessForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();

    return MicrophonePermissions(
      backButton: const MultiPageBackButton(),
      nextButton: FilledButton(
        onPressed: () => presenter.pushPage<KeyboardAccessForm>(),
        child: const Text('Next'),
      ),
    );
  }
}
