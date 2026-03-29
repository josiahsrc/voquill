import 'package:app/actions/session_actions.dart';
import 'package:app/actions/snackbar_actions.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class RemoteDictationPage extends StatelessWidget {
  const RemoteDictationPage({super.key, required this.sessionId});

  final String sessionId;

  @override
  Widget build(BuildContext context) {
    final session = useAppStore().select(
      context,
      (s) => s.desktopSessionById[sessionId],
    );
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(session?.name ?? 'Session')),
      body: Center(
        child: Padding(
          padding: Theming.padding,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.mic_rounded,
                size: 64,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Tap to send text',
                style: theme.textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Text will be pasted on your desktop',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: () async {
                  await sendPasteText(sessionId, 'Hello from mobile!');
                  showSnackbar('Text sent to ${session?.name ?? 'desktop'}');
                },
                icon: const Icon(Icons.send_rounded),
                label: const Text('Send test text'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
