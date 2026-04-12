import 'package:app/theme/app_colors.dart';
import 'package:app/widgets/common/audio_waveform.dart';
import 'package:flutter/material.dart';

enum DictationPillStatus { idle, recording, processing }

class DictationPill extends StatelessWidget {
  const DictationPill({
    super.key,
    required this.status,
    required this.audioLevel,
    required this.onTapDown,
    required this.onTapUp,
    required this.onTapCancel,
  });

  static const double width = 240;
  static const double height = 64;
  static const double radius = 32;

  final DictationPillStatus status;
  final double audioLevel;
  final GestureTapDownCallback onTapDown;
  final GestureTapUpCallback onTapUp;
  final VoidCallback onTapCancel;

  bool get _isIdle => status == DictationPillStatus.idle;
  bool get _isRecording => status == DictationPillStatus.recording;
  bool get _isProcessing => status == DictationPillStatus.processing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    return GestureDetector(
      onTapDown: onTapDown,
      onTapUp: onTapUp,
      onTapCancel: onTapCancel,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: colors.primary,
          borderRadius: BorderRadius.circular(radius),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          alignment: Alignment.center,
          children: [
            AnimatedOpacity(
              opacity: _isIdle ? 1 : 0,
              duration: const Duration(milliseconds: 150),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.mic_rounded, size: 28, color: colors.onPrimary),
                  const SizedBox(width: 8),
                  Text(
                    'Tap to dictate',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: colors.onPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            AnimatedOpacity(
              opacity: _isRecording ? 1 : 0,
              duration: const Duration(milliseconds: 150),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: AudioWaveform(
                  audioLevel: audioLevel,
                  active: _isRecording,
                  strokeColor: colors.onPrimary,
                ),
              ),
            ),
            AnimatedOpacity(
              opacity: _isProcessing ? 1 : 0,
              duration: const Duration(milliseconds: 150),
              child: SizedBox(
                width: width,
                child: LinearProgressIndicator(
                  backgroundColor: colors.onPrimary.withValues(alpha: 0.2),
                  valueColor: AlwaysStoppedAnimation(colors.onPrimary),
                ),
              ),
            ),
            if (_isRecording || _isProcessing)
              Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(radius),
                      gradient: LinearGradient(
                        colors: [
                          colors.primary,
                          colors.primary.withValues(alpha: 0),
                          colors.primary.withValues(alpha: 0),
                          colors.primary,
                        ],
                        stops: const [0, 0.15, 0.85, 1],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
