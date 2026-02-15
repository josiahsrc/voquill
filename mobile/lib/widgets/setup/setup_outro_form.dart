import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/common/try_discord_form.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SetupOutroForm extends StatelessWidget {
  const SetupOutroForm({super.key});

  @override
  Widget build(BuildContext context) {
    return TryDiscordForm(
      backButton: const MultiPageBackButton(),
      title: const Text("You're all set!"),
      description: const Text(
        'Try dictating something below, then head to the dashboard.',
      ),
      action: FilledButton(
        onPressed: () => context.go('/dashboard'),
        child: const Text('Done'),
      ),
    );
  }
}
