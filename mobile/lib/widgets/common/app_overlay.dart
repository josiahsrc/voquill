import 'package:flutter/material.dart';

enum AppOverlayType { dictation, paywall }

final appOverlay = ValueNotifier<AppOverlayType?>(null);

void showAppOverlay(AppOverlayType type) => appOverlay.value = type;
void dismissAppOverlay() => appOverlay.value = null;

class AppOverlay extends StatefulWidget {
  const AppOverlay({super.key, required this.child, required this.builder});

  final Widget child;
  final Widget Function(AppOverlayType type) builder;

  @override
  State<AppOverlay> createState() => _AppOverlayState();
}

class _AppOverlayState extends State<AppOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<double> _scale;
  late final Animation<Offset> _slide;
  late final Animation<double> _radius;
  AppOverlayType? _current;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    final curve = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInBack,
    );
    _fade = curve;
    _scale = Tween<double>(begin: 0.94, end: 1.0).animate(curve);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.05),
      end: Offset.zero,
    ).animate(curve);
    _radius = Tween<double>(begin: 142, end: 0).animate(curve);
    appOverlay.addListener(_onChanged);
  }

  @override
  void dispose() {
    appOverlay.removeListener(_onChanged);
    _controller.dispose();
    super.dispose();
  }

  void _onChanged() {
    final value = appOverlay.value;
    if (value != null) {
      setState(() => _current = value);
      _controller.forward();
    } else {
      _controller.reverse().then((_) {
        if (mounted) setState(() => _current = null);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_current != null)
          SlideTransition(
            position: _slide,
            child: ScaleTransition(
              scale: _scale,
              child: FadeTransition(
                opacity: _fade,
                child: AnimatedBuilder(
                  animation: _radius,
                  builder: (context, child) => ClipRRect(
                    borderRadius: BorderRadius.circular(_radius.value),
                    child: child,
                  ),
                  child: widget.builder(_current!),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
