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
            child: const Text('Enable Microphone'),
          );

    return OnboardingFormLayout(
      backButton: widget.backButton,
      actions: [button],
      child: OnboardingBody(
        title: const Text('Microphone access'),
        description: const Text(
          'Voquill needs access to your microphone to transcribe your voice.',
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.mic,
                  size: 56,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Tap the button below to grant microphone access.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
