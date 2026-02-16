import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/permissions/keyboard_permissions.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SetupKeyboardForm extends StatelessWidget {
  const SetupKeyboardForm({super.key});

  @override
  Widget build(BuildContext context) {
    return KeyboardPermissions(
      backButton: const MultiPageBackButton(),
      nextButton: FilledButton(
        onPressed: () => context.go('/dashboard'),
        child: const Text('Next'),
      ),
    );
  }
}
