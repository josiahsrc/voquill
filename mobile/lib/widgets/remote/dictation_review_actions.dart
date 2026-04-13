import 'package:app/theme/app_colors.dart';
import 'package:app/widgets/common/compression.dart';
import 'package:app/widgets/remote/dictation_pill.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';

class DictationReviewActions extends StatelessWidget {
  const DictationReviewActions({super.key, required this.swiperController});

  final CardSwiperController swiperController;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _ReviewActionButton(
          icon: Icons.close_rounded,
          background: colors.error,
          foreground: colors.onError,
          onTap: () => swiperController.swipe(CardSwiperDirection.left),
        ),
        const SizedBox(width: 24),
        _ReviewActionButton(
          icon: Icons.check_rounded,
          background: colors.success,
          foreground: colors.onSuccess,
          onTap: () => swiperController.swipe(CardSwiperDirection.right),
        ),
      ],
    );
  }
}

class _ReviewActionButton extends StatelessWidget {
  const _ReviewActionButton({
    required this.icon,
    required this.background,
    required this.foreground,
    required this.onTap,
  });

  final IconData icon;
  final Color background;
  final Color foreground;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableCompression(
      child: GestureDetector(
        onTapDown: (_) => HapticFeedback.mediumImpact(),
        onTap: onTap,
        child: Container(
          width: DictationPill.height,
          height: DictationPill.height,
          decoration: BoxDecoration(shape: BoxShape.circle, color: background),
          child: Icon(icon, size: 36, color: foreground),
        ),
      ),
    );
  }
}
