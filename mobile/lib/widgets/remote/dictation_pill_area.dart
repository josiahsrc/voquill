import 'package:app/state/remote_state.dart';
import 'package:app/widgets/common/app_animated_size.dart';
import 'package:app/widgets/common/app_animated_switcher.dart';
import 'package:app/widgets/remote/dictation_cancel_button.dart';
import 'package:app/widgets/remote/dictation_pill.dart';
import 'package:flutter/material.dart';

class DictationPillArea extends StatelessWidget {
  const DictationPillArea({
    super.key,
    required this.status,
    required this.audioLevel,
    required this.isRecording,
    required this.denying,
    required this.onTapDown,
    required this.onTapUp,
    required this.onTapCancel,
    required this.onCancelRecording,
  });

  final DictationPillStatus status;
  final double audioLevel;
  final bool isRecording;
  final bool denying;
  final GestureTapDownCallback onTapDown;
  final GestureTapUpCallback onTapUp;
  final VoidCallback onTapCancel;
  final VoidCallback onCancelRecording;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AppAnimatedSize(
          child: denying
              ? Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    'Describe what you want changed',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                  ),
                )
              : const SizedBox.shrink(),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            DictationPill(
              status: status,
              audioLevel: audioLevel,
              onTapDown: onTapDown,
              onTapUp: onTapUp,
              onTapCancel: onTapCancel,
            ),
            AppAnimatedSize(
              child: AppAnimatedSwitcher(
                child: isRecording
                    ? Padding(
                        key: const ValueKey('cancel'),
                        padding: const EdgeInsets.only(left: 12),
                        child: DictationCancelButton(onTap: onCancelRecording),
                      )
                    : const SizedBox.shrink(key: ValueKey('cancel-empty')),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
