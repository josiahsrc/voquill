import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_button.dart';
import 'package:app/widgets/common/asset_video_player.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_try_discord_form.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';

class DemoForm extends StatelessWidget {
  const DemoForm({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [
        AppButton.filled(
          onPressed: () =>
              context.presenter().pushPage<OnboardingTryDiscordForm>(),
          child: const Text('Continue'),
        ),
      ],
      child: Padding(
        padding: Theming.padding,
        child: Column(
          children: [
            Text(
              'How it works',
              style: theme.textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              "To enable voice typing, select Voquill as your keyboard then tap the dictate button.",
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            Spacer(),
            AssetVideoPlayer.phone(
              asset: 'assets/voquill-demo-ios.mp4',
              aspectRatio: 292 / 540,
            ),
            Spacer(),
          ],
        ),
      ),
    );
  }
}
