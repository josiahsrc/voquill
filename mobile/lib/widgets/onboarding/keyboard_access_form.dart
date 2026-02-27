import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/pro_unlocked_form.dart';
import 'package:app/widgets/permissions/keyboard_permissions.dart';
import 'package:flutter/material.dart';

class KeyboardAccessForm extends StatelessWidget {
  const KeyboardAccessForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();

    return KeyboardPermissions(
      backButton: const MultiPageBackButton(),
      nextButton: FilledButton(
        onPressed: () => presenter.pushPage<ProUnlockedForm>(),
        child: const Text('Next'),
      ),
    );
  }
}
