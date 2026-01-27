import 'dart:math';
import 'dart:ui';

import 'package:app/utils/color_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:simple_animations/animation_mixin/animation_mixin.dart';

const _kDuration = Duration(milliseconds: 180);
const _kCurve = Curves.easeInOut;
const _kPadding = 16.0;

class AppMenuContainer extends StatefulWidget {
  const AppMenuContainer({
    super.key,
    this.width,
    this.preview,
    required this.items,
    this.onClosed,
  });

  final Widget? preview;
  final List<Widget> items;
  final double? width;
  final VoidCallback? onClosed;

  @override
  State<AppMenuContainer> createState() => _AppMenuContainerState();
}

class _AppMenuContainerState extends State<AppMenuContainer> {
  final scroll = ScrollController();

  @override
  void dispose() {
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final width = widget.width ?? 250;
    final mq = MediaQuery.of(context);

    Widget? top;
    if (widget.preview != null || widget.onClosed != null) {
      top = Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.preview != null)
            Padding(
              padding: Theming.padding.withoutBottom(),
              child: LimitedBox(maxWidth: width / 2, child: widget.preview),
            ),
          const Spacer(),
          if (widget.onClosed != null)
            IconButton(
              onPressed: widget.onClosed,
              icon: const Icon(Icons.close),
            ),
        ],
      );
    }

    final children = <Widget>[
      if (top != null) top,
      const SizedBox(height: 8),
      ...widget.items,
      const SizedBox(height: 8),
    ];

    return SizedBox(
      width: width,
      child: Card(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: mq.size.height * .7),
          child: Scrollbar(
            thumbVisibility: true,
            controller: scroll,
            child: SingleChildScrollView(
              controller: scroll,
              child: Column(mainAxisSize: MainAxisSize.min, children: children),
            ),
          ),
        ),
      ),
    );
  }
}

class AppMenuController with ChangeNotifier {
  bool _isOpen = false;

  bool get isOpen => _isOpen;

  void open() {
    _isOpen = true;
    notifyListeners();
  }

  void close() {
    _isOpen = false;
    notifyListeners();
  }

  void toggle() {
    _isOpen = !_isOpen;
    notifyListeners();
  }
}

class AppMenu extends StatefulWidget {
  const AppMenu({
    super.key,
    required this.controller,
    required this.child,
    required this.menuBuilder,
    this.menuAlignment,
  });

  final AppMenuController controller;
  final Widget child;
  final WidgetBuilder menuBuilder;
  final Alignment? menuAlignment;

  @override
  State<AppMenu> createState() => _AppMenuState();
}

class _AppMenuState extends State<AppMenu> {
  final _rootKey = GlobalKey();
  final _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;

  @override
  void initState() {
    widget.controller.addListener(_onChanged);
    super.initState();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    super.dispose();
  }

  void _tryOpen() {
    if (widget.controller.isOpen && _overlayEntry == null) {
      _buildAndShowOverlay();
    }
  }

  void _hideOverlayImmediate() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _onChanged() {
    _tryOpen();
  }

  void _buildAndShowOverlay() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _overlayEntry != null) {
        return;
      }

      final overlayEntry = OverlayEntry(
        builder: (context) => _Overlay(
          rootKey: _rootKey,
          layerLink: _layerLink,
          controller: widget.controller,
          onDismissed: () {
            widget.controller.close();
          },
          onExited: _hideOverlayImmediate,
          menuAlignment: widget.menuAlignment ?? Alignment.topLeft,
          menuBuilder: widget.menuBuilder,
          theme: Theme.of(context),
        ),
      );

      Overlay.of(context).insert(overlayEntry);
      _overlayEntry = overlayEntry;
    });
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      key: _rootKey,
      child: widget.child,
    );
  }
}

class _Overlay extends StatefulWidget {
  final GlobalKey rootKey;
  final LayerLink layerLink;
  final AppMenuController controller;
  final VoidCallback onDismissed;
  final VoidCallback onExited;
  final WidgetBuilder menuBuilder;
  final Alignment menuAlignment;
  final ThemeData theme;

  const _Overlay({
    required this.rootKey,
    required this.layerLink,
    required this.controller,
    required this.onDismissed,
    required this.onExited,
    required this.menuBuilder,
    required this.menuAlignment,
    required this.theme,
  });

  @override
  State<_Overlay> createState() => _OverlayState();
}

class _OverlayState extends State<_Overlay> with AnimationMixin {
  final _menuKey = GlobalKey();
  Offset _menuOffset = Offset.zero;
  late Animation<double> _t;
  MediaQueryData? _lastMediaQueryData;

  @override
  void initState() {
    _t = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(parent: controller, curve: _kCurve));
    controller.duration = _kDuration;
    controller.forward();
    controller.addStatusListener(_onAnimStatusChanged);
    widget.controller.addListener(_onOverlayChanged);
    controller.addListener(_onAnimChange);
    super.initState();
  }

  @override
  void dispose() {
    controller.removeStatusListener(_onAnimStatusChanged);
    widget.controller.removeListener(_onOverlayChanged);
    controller.removeListener(_onAnimChange);
    super.dispose();
  }

  /// In order to stay in bounds, we need to calculate the size of the menu
  /// and adjust the offset such that the menu stays within the bounds of the
  /// screen.
  void _computeMenuOffset() {
    final mq = MediaQuery.of(context);
    final screenSize = mq.size;

    final viewInsets = mq.viewInsets;
    final padding = mq.padding;

    final screenPadding = EdgeInsets.only(
      top: max(viewInsets.top, padding.top),
      bottom: max(viewInsets.bottom, padding.bottom),
      left: max(viewInsets.left, padding.left),
      right: max(viewInsets.right, padding.right),
    );

    final menuRend = _menuKey.currentContext?.findRenderObject() as RenderBox?;
    if (menuRend == null) {
      return;
    }

    final menuSize = menuRend.size;
    final menuOffset = menuRend.localToGlobal(Offset.zero);
    final menuEnd = Offset(
      menuOffset.dx + menuSize.width,
      menuOffset.dy + menuSize.height,
    );

    final startX = menuOffset.dx;
    final startY = menuOffset.dy;
    final endX = menuEnd.dx;
    final endY = menuEnd.dy;

    _menuOffset = Offset.zero;
    if (startX < screenPadding.left + _kPadding) {
      _menuOffset = _menuOffset.translate(
        screenPadding.left + _kPadding - startX,
        0,
      );
    }
    if (endX > screenSize.width - screenPadding.right - _kPadding) {
      _menuOffset = _menuOffset.translate(
        screenSize.width - screenPadding.right - _kPadding - endX,
        0,
      );
    }
    if (startY < screenPadding.top + _kPadding) {
      _menuOffset = _menuOffset.translate(
        0,
        screenPadding.top + _kPadding - startY,
      );
    }
    if (endY > screenSize.height - screenPadding.bottom - _kPadding) {
      _menuOffset = _menuOffset.translate(
        0,
        screenSize.height - screenPadding.bottom - _kPadding - endY,
      );
    }
  }

  void _handleMediaQueryChange() {
    final mq = MediaQuery.of(context);
    if (_lastMediaQueryData != mq) {
      _lastMediaQueryData = mq;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _computeMenuOffset();
        setState(() {});
      });
    }
  }

  void _onAnimChange() {
    setState(() {
      _computeMenuOffset();
    });
  }

  void _onOverlayChanged() {
    setState(() {});
    if (!widget.controller.isOpen) {
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
    final mq = MediaQuery.of(context);
    final theme = Theme.of(context);

    _handleMediaQueryChange();
    _lastMediaQueryData = mq;

    final backdropColor = theme.colorScheme.surface.withApproxOpacity(0.7);
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

    final content = Transform.scale(
      alignment: widget.menuAlignment,
      scale: lerpDouble(.8, 1, _t.value),
      child: Opacity(opacity: _t.value, child: widget.menuBuilder(context)),
    );

    final menu = CompositedTransformFollower(
      link: widget.layerLink,
      showWhenUnlinked: false,
      targetAnchor: widget.menuAlignment,
      followerAnchor: widget.menuAlignment,
      offset: _menuOffset,
      child: content,
    );

    // Used to determine the offset of the menu, without being affected by
    // the offset.
    final ghostMenu = CompositedTransformFollower(
      link: widget.layerLink,
      showWhenUnlinked: false,
      targetAnchor: widget.menuAlignment,
      followerAnchor: widget.menuAlignment,
      child: Opacity(
        key: _menuKey,
        opacity: 0,
        child: widget.menuBuilder(context),
      ),
    );

    return Material(
      type: MaterialType.transparency,
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Theme(
          data: widget.theme,
          child: Stack(children: <Widget>[backdrop, ghostMenu, menu]),
        ),
      ),
    );
  }
}

class AppMenuButton extends StatefulWidget {
  const AppMenuButton({
    super.key,
    required this.childBuilder,
    required this.menuBuilder,
    this.menuAlignment,
  });

  final Widget Function(BuildContext context, VoidCallback open) childBuilder;
  final Widget Function(BuildContext context, VoidCallback close) menuBuilder;
  final Alignment? menuAlignment;

  @override
  State<AppMenuButton> createState() => _AppMenuButtonState();
}

class _AppMenuButtonState extends State<AppMenuButton> {
  final _controller = AppMenuController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppMenu(
      menuAlignment: widget.menuAlignment,
      controller: _controller,
      menuBuilder: (context) => widget.menuBuilder(context, _controller.close),
      child: widget.childBuilder(context, _controller.toggle),
    );
  }
}
