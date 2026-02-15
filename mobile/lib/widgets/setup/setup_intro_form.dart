import 'package:app/actions/auth_actions.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/setup/setup_microphone_form.dart';
import 'package:flutter/material.dart';

class SetupIntroForm extends StatelessWidget {
  const SetupIntroForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();
    final theme = Theme.of(context);
    final mq = MediaQuery.of(context);

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            onPressed: () => signOut(),
            icon: const Icon(Icons.logout_outlined),
          ),
        ],
      ),
      body: Padding(
        padding: EdgeInsets.only(
          left: Theming.paddingValue + mq.viewPadding.left,
          right: Theming.paddingValue + mq.viewPadding.right,
          bottom: mq.viewPadding.bottom + Theming.paddingValue,
        ),
        child: Column(
          children: [
            const Spacer(flex: 1),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Welcome back! 👋',
                  style: theme.textTheme.headlineLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Voquill needs microphone and keyboard\naccess to do its thing.',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
            const Spacer(),
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.all(Theming.radius),
                ),
                child: const Placeholder(),
              ),
            ),
            const Spacer(flex: 2),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => presenter.pushPage<SetupMicrophoneForm>(),
                child: const Text('Let\'s go'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
