import 'package:app/theme/app_colors.dart';
import 'package:app/theme/pretty_colors.dart';
import 'package:app/utils/color_utils.dart';
import 'package:app/widgets/common/compression.dart';
import 'package:flutter/material.dart';

const double _kBoxSize = 40.0;
const double _kGap = 8.0;
const double _kGradientWidth = 16.0;
const Duration _kSelectionDuration = Duration(milliseconds: 100);
const Duration _kAnimationDuration = Duration(milliseconds: 100);
const Duration _kOpacityDuration = Duration(milliseconds: 100);
const double _kOffset = _kBoxSize + _kGap / 2;

class _ColorBox extends StatefulWidget {
  const _ColorBox({required this.color, required this.selected, this.onTap});

  final Color color;
  final bool selected;
  final VoidCallback? onTap;

  @override
  State<_ColorBox> createState() => _ColorBoxState();
}

class _ColorBoxState extends State<_ColorBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: _kSelectionDuration,
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 0.5,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

    if (widget.selected) {
      _controller.forward();
    }
  }

  @override
  void didUpdateWidget(_ColorBox oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selected != oldWidget.selected) {
      if (widget.selected) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Compression(
      compression: 0.9,
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          width: _kBoxSize,
          height: _kBoxSize,
          decoration: BoxDecoration(
            color: widget.color,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Stack(
            children: [
              // Selection border
              if (widget.selected)
                AnimatedBuilder(
                  animation: _fadeAnimation,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: colors.primary, width: 4),
                    ),
                  ),
                  builder: (context, child) =>
                      Opacity(opacity: _fadeAnimation.value, child: child),
                ),
              // Selection dot
              if (widget.selected)
                Center(
                  child: AnimatedBuilder(
                    animation: _controller,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: colors.primary,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    builder: (context, child) => Transform.scale(
                      scale: _scaleAnimation.value,
                      child: Opacity(
                        opacity: _fadeAnimation.value,
                        child: child,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class ColorPicker extends StatefulWidget {
  const ColorPicker({
    super.key,
    this.value,
    this.onChanged,
    this.padding = 0.0,
  });

  final Color? value;
  final ValueChanged<Color>? onChanged;
  final double padding;

  @override
  State<ColorPicker> createState() => _ColorPickerState();
}

class _ColorPickerState extends State<ColorPicker>
    with TickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _containerKey = GlobalKey();

  late AnimationController _overlayController;
  late Animation<double> _overlayAnimation;

  double _containerWidth = 0;
  double _contentWidth = 0;
  double _scrollOffset = 0;

  int get _selectedIndex {
    if (widget.value == null) return -1;
    return PrettyColors.ordered.indexOf(widget.value!);
  }

  String get _stickySide {
    if (_selectedIndex == -1) return 'none';
    final start = _selectedIndex * (_kBoxSize + _kGap);
    final end = start + _kBoxSize;
    final left = _scrollOffset;
    final right = left + _containerWidth;
    if (start < left) return 'left';
    if (end > right) return 'right';
    return 'none';
  }

  double get _overlayX {
    if (_selectedIndex == -1) return -1000;

    // Calculate the actual position of the selected color box
    final actualPosition = _selectedIndex * (_kBoxSize + _kGap) - _scrollOffset;

    // Check if it needs to stick to edges
    if (_stickySide == 'left') return 0;
    if (_stickySide == 'right') return _containerWidth - _kBoxSize;

    // Return the actual position when not sticking
    return actualPosition;
  }

  bool get _showLeftGradient => _scrollOffset > 0;
  bool get _showRightGradient =>
      _scrollOffset + _containerWidth < _contentWidth;

  @override
  void initState() {
    super.initState();
    _overlayController = AnimationController(
      duration: _kSelectionDuration,
      vsync: this,
    );
    _overlayAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _overlayController, curve: Curves.easeInOut),
    );

    _scrollController.addListener(_onScroll);

    if (widget.value != null) {
      _overlayController.forward();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _updateContentWidth();
      _measureContainer();
    });
  }

  @override
  void didUpdateWidget(ColorPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value) {
      if (widget.value != null) {
        _overlayController.forward();
      } else {
        _overlayController.reverse();
      }
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _overlayController.dispose();
    super.dispose();
  }

  void _onScroll() {
    setState(() {
      _scrollOffset = _scrollController.offset;
    });
  }

  void _updateContentWidth() {
    _contentWidth = PrettyColors.ordered.length * (_kBoxSize + _kGap) - _kGap;
    setState(() {});
  }

  void _measureContainer() {
    final RenderBox? renderBox =
        _containerKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox != null) {
      setState(() {
        _containerWidth = renderBox.size.width - widget.padding * 2;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final transparentBackground = colors.level0.withApproxOpacity(0);

    return SizedBox(
      key: _containerKey,
      width: double.infinity,
      height: _kBoxSize,
      child: Stack(
        children: [
          // Main scroll view
          Positioned.fill(
            child: SingleChildScrollView(
              controller: _scrollController,
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: widget.padding),
              child: Row(
                children: PrettyColors.ordered
                    .map(
                      (color) => Padding(
                        padding: EdgeInsets.only(
                          right: color == PrettyColors.ordered.last ? 0 : _kGap,
                        ),
                        child: _ColorBox(
                          color: color,
                          selected: widget.value == color,
                          onTap: () => widget.onChanged?.call(color),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),

          // Left mask
          AnimatedPositioned(
            duration: _kAnimationDuration,
            left: 0,
            top: 0,
            bottom: 0,
            width: _stickySide == 'left' ? _kOffset + widget.padding : 0,
            child: AnimatedOpacity(
              duration: _kOpacityDuration,
              opacity: _showLeftGradient ? 1.0 : 0.0,
              child: Container(color: colors.level0),
            ),
          ),

          // Right mask
          AnimatedPositioned(
            duration: _kAnimationDuration,
            right: 0,
            top: 0,
            bottom: 0,
            width: _stickySide == 'right' ? _kOffset + widget.padding : 0,
            child: AnimatedOpacity(
              duration: _kOpacityDuration,
              opacity: _showRightGradient ? 1.0 : 0.0,
              child: Container(color: colors.level0),
            ),
          ),

          // Left gradient
          AnimatedPositioned(
            duration: _kAnimationDuration,
            left: _stickySide == 'left' ? _kOffset + widget.padding : 0,
            top: 0,
            bottom: 0,
            width: _kGradientWidth,
            child: AnimatedOpacity(
              duration: _kOpacityDuration,
              opacity: _showLeftGradient ? 1.0 : 0.0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [colors.level0, transparentBackground],
                  ),
                ),
              ),
            ),
          ),

          // Right gradient
          AnimatedPositioned(
            duration: _kAnimationDuration,
            right: _stickySide == 'right' ? _kOffset + widget.padding : 0,
            top: 0,
            bottom: 0,
            width: _kGradientWidth,
            child: AnimatedOpacity(
              duration: _kOpacityDuration,
              opacity: _showRightGradient ? 1.0 : 0.0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerRight,
                    end: Alignment.centerLeft,
                    colors: [colors.level0, transparentBackground],
                  ),
                ),
              ),
            ),
          ),

          // Overlay selection
          if (widget.value != null)
            Positioned(
              left: _overlayX + widget.padding,
              top: 0,
              child: AnimatedBuilder(
                animation: _overlayAnimation,
                child: IgnorePointer(
                  child: _ColorBox(color: widget.value!, selected: true),
                ),
                builder: (context, child) => Opacity(
                  opacity: _selectedIndex == -1 ? 0.0 : _overlayAnimation.value,
                  child: child,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
