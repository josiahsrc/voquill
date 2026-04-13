import 'package:app/theme/app_colors.dart';
import 'package:flutter/material.dart';

class DictationReviewCard extends StatelessWidget {
  const DictationReviewCard({
    super.key,
    required this.message,
    this.approveProgress = 0,
    this.denyProgress = 0,
  });

  final String message;
  final double approveProgress;
  final double denyProgress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    return Stack(
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: colors.level1,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Center(
            child: Text(
              message,
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
          ),
        ),
        if (approveProgress > 0)
          Positioned(
            top: 20,
            left: 20,
            child: _Stamp(
              label: 'APPROVED',
              background: colors.success,
              foreground: colors.onSuccess,
              rotation: -0.25,
              opacity: approveProgress,
            ),
          ),
        if (denyProgress > 0)
          Positioned(
            top: 20,
            right: 20,
            child: _Stamp(
              label: 'DENIED',
              background: colors.error,
              foreground: colors.onError,
              rotation: 0.25,
              opacity: denyProgress,
            ),
          ),
      ],
    );
  }
}

class _Stamp extends StatelessWidget {
  const _Stamp({
    required this.label,
    required this.background,
    required this.foreground,
    required this.rotation,
    required this.opacity,
  });

  final String label;
  final Color background;
  final Color foreground;
  final double rotation;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: Transform.rotate(
        angle: rotation,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: foreground,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
              fontSize: 20,
            ),
          ),
        ),
      ),
    );
  }
}
