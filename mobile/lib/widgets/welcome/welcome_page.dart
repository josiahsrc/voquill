import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_logo.dart';
import 'package:app/widgets/welcome/vector_field.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mq = MediaQuery.of(context);
    final backgroundColor = theme.scaffoldBackgroundColor;

    return Scaffold(
      body: Stack(
        children: [
          const VectorField(),
          Positioned.fill(
            child: Column(
              children: [
                Expanded(
                  child: Center(
                    child: Container(
                      decoration: BoxDecoration(
                        boxShadow: [
                          BoxShadow(
                            color: backgroundColor.withValues(alpha: .9),
                            blurRadius: 40,
                            spreadRadius: 20,
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              AppLogo(size: 56),
                              SizedBox(width: 8),
                              Text(
                                'Voquill',
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Voice is your new keyboard.',
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.only(
                    bottom: mq.viewPadding.bottom + Theming.padding.bottom,
                    left: mq.viewPadding.left + Theming.padding.left,
                    right: mq.viewPadding.right + Theming.padding.right,
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      boxShadow: [
                        BoxShadow(
                          color: backgroundColor.withValues(alpha: .9),
                          blurRadius: 40,
                          spreadRadius: 20,
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 12,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        FilledButton(
                          onPressed: () => _handleGetStarted(context),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text('Get started'),
                        ),
                        const SizedBox(height: 4),
                        TextButton(
                          onPressed: () => _handleLogin(context),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text('I already have an account'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _handleGetStarted(BuildContext context) {
    context.push('/onboarding');
  }

  void _handleLogin(BuildContext context) {
    context.push('/login');
  }
}
