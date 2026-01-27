import 'package:app/theme/app_colors.dart';
import 'package:app/utils/collection_utils.dart';
import 'package:app/utils/color_utils.dart';
import 'package:app/widgets/common/animated_offstage.dart';
import 'package:app/widgets/common/app_animated_switcher.dart';
import 'package:flutter/material.dart';
import 'package:simple_animations/animation_mixin/animation_mixin.dart';

const _kDuration = Duration(milliseconds: 180);
const _kHeight = 56.0;
const _kCurve = Curves.easeInOut;
const _kFocusedRadius = BorderRadius.all(Radius.circular(36));
const _kUnfocusedRadius = BorderRadius.all(Radius.circular(16));

enum _AppFabPreset { cancel }

class AppFabAction {
  const AppFabAction._preset(
    this._preset, {
    required this.icon,
    required this.onPressed,
  }) : builder = null,
       rawFgColor = null,
       rawBgColor = null,
       label = null;

  const AppFabAction({
    this.label,
    this.icon,
    this.onPressed,
    Color? fgColor,
    Color? bgColor,
  }) : builder = null,
       _preset = null,
       rawFgColor = fgColor,
       rawBgColor = bgColor;

  factory AppFabAction.cancel({VoidCallback? onPressed}) {
    return AppFabAction._preset(
      _AppFabPreset.cancel,
      icon: const Icon(Icons.close),
      onPressed: onPressed,
    );
  }

  final Widget? label;
  final Widget? icon;
  final VoidCallback? onPressed;
  final Color? rawFgColor;
  final Color? rawBgColor;
  final WidgetBuilder? builder;
  final _AppFabPreset? _preset;

  Color? getFgColor(BuildContext context) {
    if (rawFgColor != null) {
      return rawFgColor;
    }

    switch (_preset) {
      case _AppFabPreset.cancel:
        return context.colors.onLevel2;
      default:
        return null;
    }
  }

  Color? getBgColor(BuildContext context) {
    if (rawBgColor != null) {
      return rawBgColor;
    }

    switch (_preset) {
      case _AppFabPreset.cancel:
        return context.colors.level2;
      default:
        return null;
    }
  }
}

class AppFab extends StatefulWidget {
  const AppFab({
    super.key,
    required this.mainActions,
    this.focusActions = const [],
    this.isFocused = false,
    this.onUnfocused,
  }) : assert(!isFocused || focusActions.length > 1);

  final List<AppFabAction> mainActions;
  final List<AppFabAction> focusActions;
  final bool isFocused;
  final VoidCallback? onUnfocused;

  @override
  State<AppFab> createState() => _AppFabState();
}

class _AppFabState extends State<AppFab> {
  final _rootKey = GlobalKey();
  final _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  _FocusOverlayController? _overlayController;

  @override
  void dispose() {
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant AppFab oldWidget) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.isFocused != oldWidget.isFocused) {
        if (widget.isFocused) {
          if (_overlayController != null) {
            _overlayController!.focus();
          } else {
            _buildAndShowOverlay();
          }
        } else {
          _overlayController?.unfocus();
        }
      }
    });
    super.didUpdateWidget(oldWidget);
  }

  void _hideOverlayImmediate() {
    _overlayEntry?.remove();
    _overlayController?.dispose();
    _overlayEntry = null;
    _overlayController = null;
  }

  void _buildAndShowOverlay() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _overlayEntry != null) {
        return;
      }

      _overlayController = _FocusOverlayController();
      _overlayController!.focus();
      final overlayEntry = OverlayEntry(
        builder: (context) => _FocusOverlay(
          rootKey: _rootKey,
          layerLink: _layerLink,
          controller: _overlayController!,
          onDismissed: widget.onUnfocused,
          onExited: _hideOverlayImmediate,
          focusActions: widget.focusActions,
        ),
      );

      Overlay.of(context).insert(overlayEntry);
      _overlayEntry = overlayEntry;
    });
  }

  @override
  Widget build(BuildContext context) {
    final mainActions = Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: <Widget>[
        for (final action in widget.mainActions)
          _ActionRend(action: action, isFocused: false),
      ].joinWith(const SizedBox(width: 8)).toList(),
    );

    return CompositedTransformTarget(
      link: _layerLink,
      key: _rootKey,
      child: SizedBox(
        width: double.infinity,
        height: _kHeight,
        child: AppAnimatedSwitcher(
          alignment: Alignment.centerRight,
          duration: _kDuration,
          axis: Axis.horizontal,
          child: widget.isFocused ? const SizedBox() : mainActions,
        ),
      ),
    );
  }
}

class _FocusOverlayController with ChangeNotifier {
  bool _isFocused = false;
  bool get isFocused => _isFocused;

  void focus() {
    _isFocused = true;
    notifyListeners();
  }

  void unfocus() {
    _isFocused = false;
    notifyListeners();
  }
}

class _FocusOverlay extends StatefulWidget {
  const _FocusOverlay({
    required this.rootKey,
    required this.layerLink,
    required this.controller,
    required this.onDismissed,
    required this.onExited,
    required this.focusActions,
  });

  final GlobalKey rootKey;
  final LayerLink layerLink;
  final _FocusOverlayController controller;
  final VoidCallback? onDismissed;
  final VoidCallback onExited;
  final List<AppFabAction> focusActions;

  @override
  State<_FocusOverlay> createState() => _FocusOverlayState();
}

class _FocusOverlayState extends State<_FocusOverlay> with AnimationMixin {
  late Animation<double> _t;

  _FocusOverlayController get _overlay => widget.controller;

  @override
  void initState() {
    _t = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(parent: controller, curve: _kCurve));
    controller.duration = _kDuration;
    controller.forward();
    controller.addStatusListener(_onAnimStatusChanged);
    _overlay.addListener(_onOverlayChanged);
    super.initState();
  }

  @override
  void dispose() {
    _overlay.removeListener(_onOverlayChanged);
    controller.removeStatusListener(_onAnimStatusChanged);
    super.dispose();
  }

  void _onOverlayChanged() {
    setState(() {});
    if (!_overlay.isFocused) {
      controller.reverse();
    }
  }

  void _onAnimStatusChanged(AnimationStatus status) {
    if (status == AnimationStatus.dismissed) {
      widget.onExited.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final backdropColor = theme.colorScheme.surface.withApproxOpacity(0.95);
    final backdrop = Positioned.fill(
      child: GestureDetector(
        onTap: widget.onDismissed,
        child: ColoredBox(
          color: Color.lerp(
            backdropColor.withApproxOpacity(0),
            backdropColor,
            _t.value,
          )!,
        ),
      ),
    );

    final actionRends = <Widget>[];
    final len = widget.focusActions.length;
    for (var i = 0; i < len; i++) {
      final action = widget.focusActions[i];
      final focused = widget.controller.isFocused;
      final crossedT = _t.value > (len - i - 1) / len;
      actionRends.add(
        AppAnimatedSwitcher(
          alignment: Alignment.centerRight,
          duration: _kDuration,
          child: focused && crossedT
              ? _ActionRend(action: action, isFocused: true)
              : const SizedBox(height: _kHeight),
        ),
      );
    }

    final buttons = CompositedTransformFollower(
      link: widget.layerLink,
      showWhenUnlinked: false,
      targetAnchor: Alignment.bottomRight,
      followerAnchor: Alignment.bottomRight,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: actionRends.joinWith(const SizedBox(height: 12)).toList(),
      ),
    );

    return Stack(children: [backdrop, buttons]);
  }
}

class _ActionRend extends StatefulWidget {
  const _ActionRend({required this.action, required this.isFocused});

  final AppFabAction action;
  final bool isFocused;

  @override
  State<_ActionRend> createState() => _ActionRendState();
}

class _ActionRendState extends State<_ActionRend> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final borderRadius = widget.isFocused ? _kFocusedRadius : _kUnfocusedRadius;

    final action = widget.action;
    final textStyle = theme.textTheme.titleMedium ?? const TextStyle();
    final fgColor = action.getFgColor(context) ?? theme.colorScheme.onPrimary;
    final bgColor = action.getBgColor(context) ?? theme.colorScheme.primary;

    Widget? innerLabel;
    if (action.label != null && !widget.isFocused) {
      innerLabel = AnimatedOffstage(
        duration: _kDuration,
        curve: _kCurve,
        offstage: widget.isFocused,
        child: Padding(
          padding: EdgeInsets.only(left: action.icon != null ? 6 : 0),
          child: DefaultTextStyle(
            style: textStyle.copyWith(color: fgColor),
            child: widget.action.label!,
          ),
        ),
      );
    }

    Widget? innerIcon;
    if (action.icon != null) {
      innerIcon = IconTheme(
        data: theme.iconTheme.copyWith(color: fgColor),
        child: widget.action.icon!,
      );
    }

    Widget? outerLabel;
    if (action.label != null && widget.isFocused) {
      final outerLabelRadius = BorderRadius.circular(4);
      outerLabel = Padding(
        padding: const EdgeInsets.only(right: 12),
        child: PhysicalModel(
          color: theme.colorScheme.primary,
          borderRadius: outerLabelRadius,
          elevation: 6,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: outerLabelRadius,
            ),
            child: DefaultTextStyle(
              style: theme.textTheme.labelLarge ?? const TextStyle(),
              child: action.label!,
            ),
          ),
        ),
      );
    }

    final fab = PhysicalModel(
      color: theme.colorScheme.primary,
      borderRadius: borderRadius,
      elevation: 6,
      child: Container(
        height: _kHeight,
        constraints: const BoxConstraints(minWidth: _kHeight),
        decoration: BoxDecoration(borderRadius: borderRadius),
        child: Material(
          color: bgColor,
          borderRadius: borderRadius,
          child: InkWell(
            borderRadius: borderRadius,
            onTap: action.onPressed,
            child: Padding(
              padding: EdgeInsets.only(
                left: widget.isFocused || action.label == null ? 0 : 12,
                right: widget.isFocused || action.label == null ? 0 : 16,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (innerIcon != null) innerIcon,
                  if (innerLabel != null) innerLabel,
                ],
              ),
            ),
          ),
        ),
      ),
    );

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [if (outerLabel != null) outerLabel, fab],
    );
  }
}
