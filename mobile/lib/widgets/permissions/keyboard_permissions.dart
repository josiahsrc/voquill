import 'package:app/store/store.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';

class KeyboardPermissions extends StatefulWidget {
  const KeyboardPermissions({
    super.key,
    this.backButton,
    required this.nextButton,
  });

  final Widget? backButton;
  final Widget nextButton;

  @override
  State<KeyboardPermissions> createState() => _KeyboardPermissionsState();
}

class _KeyboardPermissionsState extends State<KeyboardPermissions>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkEnabled();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkEnabled();
    }
  }

  Future<void> _checkEnabled() async {
    final enabled = await isKeyboardEnabled();
    if (mounted) {
      produceAppState((draft) {
        draft.hasKeyboardPermission = enabled;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEnabled = useAppStore().select(
      context,
      (s) => s.hasKeyboardPermission,
    );

    final button = isEnabled
        ? widget.nextButton
        : FilledButton(
            key: const ValueKey('open-keyboard-settings'),
            onPressed: openKeyboardSettings,
            child: const Text('Open Settings'),
          );

    return OnboardingFormLayout(
      backButton: widget.backButton,
      actions: [button],
      child: OnboardingBody(
        title: const Text('Keyboard access'),
        description: const Text(
          'Add Voquill as a keyboard to use voice input in any app.',
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _StepItem(
              number: 1,
              title: 'Open Settings',
              description: 'Tap the button below to open keyboard settings.',
              theme: theme,
            ),
            const SizedBox(height: 16),
            _StepItem(
              number: 2,
              title: 'Add Voquill Keyboard',
              description: 'Find Voquill in the list and enable it.',
              theme: theme,
            ),
            const SizedBox(height: 16),
            _StepItem(
              number: 3,
              title: 'Allow Full Access',
              description: 'Grant full access for the best experience.',
              theme: theme,
            ),
          ],
        ),
      ),
    );
  }
}

class _StepItem extends StatelessWidget {
  const _StepItem({
    required this.number,
    required this.title,
    required this.description,
    required this.theme,
  });

  final int number;
  final String title;
  final String description;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$number',
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
