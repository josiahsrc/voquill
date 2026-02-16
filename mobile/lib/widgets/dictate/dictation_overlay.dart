import 'package:app/theme/app_colors.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_rive.dart';
import 'package:flutter/material.dart';

final _visible = ValueNotifier<bool>(false);

void showDictationDialog() {
  _visible.value = true;
}

/// Sits on-top of the entire app so we can show this from anywhere
/// without getting interrupted by navigation.
class DictationOverlay extends StatefulWidget {
  const DictationOverlay({super.key, required this.child});
  final Widget child;

  @override
  State<DictationOverlay> createState() => _DictationOverlayState();
}

class _DictationOverlayState extends State<DictationOverlay>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;
  bool _showOverlay = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
      reverseCurve: Curves.easeIn,
    );
    _visible.addListener(_onVisibilityChanged);
  }

  @override
  void dispose() {
    _visible.removeListener(_onVisibilityChanged);
    _controller.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _onVisibilityChanged() {
    if (_visible.value) {
      setState(() => _showOverlay = true);
      _controller.forward();
    } else {
      _controller.reverse().then((_) {
        if (mounted) setState(() => _showOverlay = false);
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _visible.value = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_showOverlay)
          FadeTransition(opacity: _animation, child: const _DictationContent()),
      ],
    );
  }
}

class _DictationContent extends StatelessWidget {
  const _DictationContent();

  @override
  Widget build(BuildContext context) {
    final bgColor = context.colors.level0;
    final theme = Theme.of(context);

    return Material(
      color: bgColor,
      child: Center(
        child: SafeArea(
          child: Padding(
            padding: Theming.padding,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Spacer(flex: 2),
                SizedBox(
                  width: 280,
                  height: 280,
                  child: _EdgeFade(
                    color: bgColor,
                    child: AppRive(
                      assetPath: 'assets/voquill.riv',
                      lightArtboard: 'Switch Light',
                      darkArtboard: 'Switch Dark',
                      stateMachine: 'State Machine 1',
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text('Voquill activated!', style: theme.textTheme.headlineSmall),
                const SizedBox(height: 12),
                Text(
                  'Switch back to your other app to start dictating',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                Spacer(flex: 3),
                Text(
                  "We wish we didn't have to do this, but Apple requires it :(",
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EdgeFade extends StatelessWidget {
  const _EdgeFade({required this.color, required this.child});
  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final transparent = color.withValues(alpha: 0);
    return Stack(
      children: [
        child,
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [color, transparent, transparent, color],
                  stops: const [0.0, 0.05, 0.95, 1.0],
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [color, transparent, transparent, color],
                  stops: const [0.0, 0.05, 0.95, 1.0],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
