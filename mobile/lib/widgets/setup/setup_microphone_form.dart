import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/permissions/microphone_permissions.dart';
import 'package:app/widgets/setup/setup_keyboard_form.dart';
import 'package:flutter/material.dart';

class SetupMicrophoneForm extends StatelessWidget {
  const SetupMicrophoneForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();

    return MicrophonePermissions(
      backButton: const MultiPageBackButton(),
      nextButton: FilledButton(
        onPressed: () => presenter.pushPage<SetupKeyboardForm>(),
        child: const Text('Next'),
      ),
    );
  }
}
