import 'package:app/store/store.dart';
import 'package:app/widgets/onboarding/onboarding_widgets.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class MicrophonePermissions extends StatefulWidget {
  const MicrophonePermissions({
    super.key,
    this.backButton,
    required this.nextButton,
  });

  final Widget? backButton;
  final Widget nextButton;

  @override
  State<MicrophonePermissions> createState() => _MicrophonePermissionsState();
}

class _MicrophonePermissionsState extends State<MicrophonePermissions>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermission();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkPermission();
    }
  }

  Future<void> _checkPermission() async {
    final status = await Permission.microphone.status;
    if (mounted) {
      produceAppState((draft) {
        draft.hasMicrophonePermission = status.isGranted;
      });
    }
  }

  Future<void> _requestPermission() async {
    final status = await Permission.microphone.request();
    if (!mounted) return;
    produceAppState((draft) {
      draft.hasMicrophonePermission = status.isGranted;
    });
    if (status.isPermanentlyDenied) {
      openAppSettings();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasPermission = useAppStore().select(
      context,
      (s) => s.hasMicrophonePermission,
    );

    final button = hasPermission
        ? widget.nextButton
        : FilledButton(
            key: const ValueKey('enable-mic'),
            onPressed: _requestPermission,
            child: const Text('Continue'),
          );

    return OnboardingFormLayout(
      backButton: widget.backButton,
      actions: [button],
      child: OnboardingBody(
        title: const Text('Microphone access'),
        description: const Text(
          'Voquill needs access to your microphone to transcribe your voice.',
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _FeatureItem(
              icon: Icons.mic,
              text: 'Type using your voice',
              theme: theme,
            ),
            const SizedBox(height: 16),
            _FeatureItem(
              icon: Icons.auto_awesome,
              text: 'AI polishes your text',
              theme: theme,
            ),
            const SizedBox(height: 16),
            _FeatureItem(
              icon: Icons.apps,
              text: 'Works in any app',
              theme: theme,
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureItem extends StatelessWidget {
  const _FeatureItem({
    required this.icon,
    required this.text,
    required this.theme,
  });

  final IconData icon;
  final String text;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 24,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }
}
