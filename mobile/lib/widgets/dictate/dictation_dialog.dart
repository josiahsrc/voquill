import 'package:flutter/material.dart';

final _visible = ValueNotifier<bool>(false);

void showDictationDialog() {
  _visible.value = true;
}

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
          FadeTransition(
            opacity: _animation,
            child: const _DictationContent(),
          ),
      ],
    );
  }
}

class _DictationContent extends StatelessWidget {
  const _DictationContent();

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Center(
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
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
