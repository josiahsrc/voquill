import 'package:app/theme/app_colors.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_logo.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:app/widgets/onboarding/onboarding_try_discord_form.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class ProUnlockedForm extends StatelessWidget {
  const ProUnlockedForm({super.key});

  @override
  Widget build(BuildContext context) {
    final presenter = context.presenter();
    final theme = Theme.of(context);

    return OnboardingFormLayout(
      backButton: const MultiPageBackButton(),
      actions: [
        FilledButton(
              onPressed: () => presenter.pushPage<OnboardingTryDiscordForm>(),
              child: const Text('Continue'),
            )
            .animate()
            .fadeIn(delay: 800.ms, duration: 400.ms)
            .slideY(begin: 0.2, end: 0),
      ],
      child: Padding(
        padding: Theming.padding.onlyHorizontal(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(flex: 2),
            Align(
              alignment: .centerLeft,
              child:
                  Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: context.colors.level1,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          'FREE TRIAL',
                          style: theme.textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      )
                      .animate()
                      .fadeIn(duration: 400.ms)
                      .scale(
                        begin: const Offset(0.8, 0.8),
                        end: const Offset(1, 1),
                      ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const AppLogo(size: 48)
                    .animate()
                    .fadeIn(delay: 200.ms, duration: 400.ms)
                    .scale(
                      begin: const Offset(0.5, 0.5),
                      end: const Offset(1, 1),
                    )
                    .rotate(begin: -0.05, end: 0),
                const SizedBox(width: 12),
                Text(
                      'Voquill',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 300.ms, duration: 400.ms)
                    .slideX(begin: -0.2, end: 0),
                const SizedBox(width: 16),
                Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: context.colors.primary,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Pro',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: context.colors.onPrimary,
                        ),
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 500.ms, duration: 400.ms)
                    .scale(
                      begin: const Offset(0.5, 0.5),
                      end: const Offset(1, 1),
                      curve: Curves.elasticOut,
                    ),
              ],
            ),
            const SizedBox(height: 24),
            Text(
                  'Pro mode unlocked 🙌',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                )
                .animate()
                .fadeIn(delay: 100.ms, duration: 500.ms)
                .slideY(begin: 0.3, end: 0),
            const SizedBox(height: 8),
            Text(
                  'One week on us. No payment info required.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                )
                .animate()
                .fadeIn(delay: 200.ms, duration: 500.ms)
                .slideY(begin: 0.3, end: 0),
            const SizedBox(height: 32),
            ..._buildFeatureList(theme),
            const Spacer(flex: 3),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildFeatureList(ThemeData theme) {
    final features = [
      (Icons.all_inclusive, 'No word limits'),
      (Icons.devices, 'Cross-device syncing'),
      (Icons.mic, 'AI dictation'),
      (Icons.spellcheck, 'Word dictionary'),
    ];

    return features.asMap().entries.map((entry) {
      final index = entry.key;
      final (icon, text) = entry.value;
      final delay = 300 + (index * 100);

      return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 20, color: theme.colorScheme.onSurfaceVariant),
                const SizedBox(width: 12),
                Text(text, style: theme.textTheme.bodyLarge),
              ],
            ),
          )
          .animate()
          .fadeIn(delay: delay.ms, duration: 500.ms, curve: Curves.easeOut)
          .slideX(
            begin: -0.1,
            end: 0,
            delay: delay.ms,
            duration: 500.ms,
            curve: Curves.easeOutCubic,
          );
    }).toList();
  }
}
