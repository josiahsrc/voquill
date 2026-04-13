import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class FocusPromptView extends StatelessWidget {
  const FocusPromptView({
    super.key,
    required this.label,
    required this.prompt,
    required this.partialText,
  });

  final String label;
  final String prompt;
  final String partialText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: Theming.padding,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              label.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                letterSpacing: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              prompt,
              style: theme.textTheme.headlineSmall?.copyWith(
                color: theme.colorScheme.onSurface,
                height: 1.3,
              ),
              textAlign: TextAlign.center,
            ),
            if (partialText.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                partialText,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  fontStyle: FontStyle.italic,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
