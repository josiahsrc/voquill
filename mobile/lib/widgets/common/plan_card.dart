import 'package:app/theme/app_colors.dart';
import 'package:app/utils/color_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/compression.dart';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';

class PlanCard extends StatefulWidget {
  final String label;
  final String price;
  final String subtitle;
  final String? badgeText;
  final bool selected;
  final VoidCallback onTap;

  const PlanCard({
    super.key,
    required this.label,
    required this.price,
    required this.subtitle,
    this.badgeText,
    required this.selected,
    required this.onTap,
  });

  @override
  State<PlanCard> createState() => _PlanCardState();
}

class _PlanCardState extends State<PlanCard>
    with SingleTickerProviderStateMixin {
  final _compressionController = CompressionController();
  late final AnimationController _selectController;

  @override
  void initState() {
    super.initState();
    _selectController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
      value: widget.selected ? 1.0 : 0.0,
    );
  }

  @override
  void didUpdateWidget(covariant PlanCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selected != widget.selected) {
      if (widget.selected) {
        _selectController.forward();
      } else {
        _selectController.reverse();
      }
    }
  }

  @override
  void dispose() {
    _compressionController.dispose();
    _selectController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.colors;

    return Listener(
      onPointerDown: (_) => _compressionController.pressed = true,
      onPointerUp: (_) => _compressionController.pressed = false,
      onPointerCancel: (_) => _compressionController.pressed = false,
      child: Compression(
        controller: _compressionController,
        durationIn: const Duration(milliseconds: 100),
        durationOut: const Duration(milliseconds: 200),
        compression: 0.96,
        child: AnimatedBuilder(
          animation: _selectController,
          builder: (context, child) {
            final t = Curves.easeOut.transform(_selectController.value);
            final borderColor =
                Color.lerp(colors.level2, colors.blue, t)!;
            final checkColor =
                Color.lerp(colors.level2, colors.blue, t)!;

            return Stack(
              clipBehavior: Clip.none,
              children: [
                Material(
                  color: colors.level0,
                  borderRadius:
                      BorderRadius.circular(Theming.radiusValue),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: widget.onTap,
                    borderRadius:
                        BorderRadius.circular(Theming.radiusValue),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border:
                            Border.all(color: borderColor, width: 2),
                        borderRadius:
                            BorderRadius.circular(Theming.radiusValue),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                widget.label,
                                style: theme.textTheme.titleSmall
                                    ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              AnimatedSwitcher(
                                duration:
                                    const Duration(milliseconds: 200),
                                switchInCurve: Curves.easeOut,
                                switchOutCurve: Curves.easeIn,
                                transitionBuilder: (child, animation) {
                                  return ScaleTransition(
                                    scale: animation,
                                    child: child,
                                  );
                                },
                                child: Icon(
                                  widget.selected
                                      ? Icons.check_circle
                                      : Icons.radio_button_unchecked,
                                  key: ValueKey(widget.selected),
                                  color: checkColor,
                                  size: 22,
                                ),
                              ),
                            ],
                          ),
                          const Gap(4),
                          Text(
                            widget.price,
                            style:
                                theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const Gap(2),
                          Text(
                            widget.subtitle,
                            style:
                                theme.textTheme.bodySmall?.copyWith(
                              color: colors.onLevel0.secondary(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (widget.badgeText != null)
                  Positioned(
                    top: -10,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: colors.blue,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.badgeText!,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colors.onBlue,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
