import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/permissions/keyboard_permissions.dart';
import 'package:app/widgets/setup/setup_outro_form.dart';
import 'package:flutter/material.dart';

class SetupKeyboardForm extends StatelessWidget {
  const SetupKeyboardForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();

    return KeyboardPermissions(
      backButton: const MultiPageBackButton(),
      nextButton: FilledButton(
        onPressed: () => presenter.pushPage<SetupOutroForm>(),
        child: const Text('Next'),
      ),
    );
  }
}
