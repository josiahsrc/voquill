import 'package:app/routing/build_router.dart';
import 'package:flutter/material.dart';

void showDictationDialog() {
  final ctx = rootNavigatorKey.currentContext;
  if (ctx == null) {
    return;
  }

  showGeneralDialog(
    context: ctx,
    barrierDismissible: false,
    barrierColor: Colors.black,
    pageBuilder: (context, animation, secondaryAnimation) {
      return const _DictationDialog();
    },
  );
}

class _DictationDialog extends StatefulWidget {
  const _DictationDialog();

  @override
  State<_DictationDialog> createState() => _DictationDialogState();
}

class _DictationDialogState extends State<_DictationDialog>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.mic,
                size: 64,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Dictation Active',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              Text(
                'Switch back to your other app to start dictating.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
