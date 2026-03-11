import 'package:app/theme/app_colors.dart';
import 'package:app/widgets/keyboard/keyboard_types.dart';
import 'package:flutter/material.dart';

class KeyboardKey extends StatefulWidget {
  final KeySpec spec;
  final VoidCallback? onTap;

  const KeyboardKey({super.key, required this.spec, this.onTap});

  @override
  State<KeyboardKey> createState() => _KeyboardKeyState();
}

class _KeyboardKeyState extends State<KeyboardKey> {
  OverlayEntry? _subKeysOverlay;
  OverlayEntry? _previewOverlay;
  int _selectedSubKeyIndex = -1;
  bool _pressed = false;
  final _keyGlobalKey = GlobalKey();

  @override
  void dispose() {
    _removeSubKeysOverlay();
    _removePreviewOverlay();
    super.dispose();
  }

  void _removeSubKeysOverlay() {
    _subKeysOverlay?.remove();
    _subKeysOverlay = null;
  }

  void _removePreviewOverlay() {
    _previewOverlay?.remove();
    _previewOverlay = null;
  }

  void _showPreview() {
    if (widget.spec.type != KeyType.character) return;

    final renderBox =
        _keyGlobalKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;

    _previewOverlay = OverlayEntry(
      builder: (context) => _KeyPreviewBubble(
        label: widget.spec.label,
        keyPosition: position,
        keySize: size,
      ),
    );

    Overlay.of(context).insert(_previewOverlay!);
  }

  void _showSubKeys() {
    if (widget.spec.subKeys.isEmpty) return;

    _removePreviewOverlay();

    final renderBox =
        _keyGlobalKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;
    final subKeys = widget.spec.subKeys;
    final subKeyWidth = 40.0;
    final spacing = 4.0;
    final padding = 4.0;
    final totalWidth =
        subKeys.length * subKeyWidth + (subKeys.length - 1) * spacing + padding * 2;
    final screenWidth = MediaQuery.of(context).size.width;
    final centered = position.dx + (size.width / 2) - (totalWidth / 2);
    final left = centered.clamp(4.0, screenWidth - totalWidth - 4.0);

    _subKeysOverlay = OverlayEntry(
      builder: (context) => Positioned(
        left: left,
        top: position.dy - 48,
        child: Container(
          padding: EdgeInsets.all(4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color: context.colors.level1,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(50),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            spacing: 4,
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < subKeys.length; i++)
                _SubKeyChip(
                  label: subKeys[i],
                  isSelected: i == _selectedSubKeyIndex,
                ),
            ],
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_subKeysOverlay!);
  }

  void _updateSubKeySelection(Offset globalPosition) {
    if (_subKeysOverlay == null || widget.spec.subKeys.isEmpty) return;

    final renderBox =
        _keyGlobalKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;
    final subKeys = widget.spec.subKeys;
    final subKeyWidth = 40.0;
    final spacing = 4.0;
    final padding = 4.0;
    final totalWidth =
        subKeys.length * subKeyWidth + (subKeys.length - 1) * spacing + padding * 2;
    final screenWidth = MediaQuery.of(context).size.width;
    final centered = position.dx + (size.width / 2) - (totalWidth / 2);
    final left = centered.clamp(4.0, screenWidth - totalWidth - 4.0);

    final relativeX = globalPosition.dx - left - padding;
    final cellWidth = subKeyWidth + spacing;
    final index = (relativeX / cellWidth).floor();

    final newIndex = index.clamp(0, subKeys.length - 1);
    if (newIndex != _selectedSubKeyIndex) {
      setState(() {
        _selectedSubKeyIndex = newIndex;
      });
      _subKeysOverlay?.markNeedsBuild();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isSpecial = widget.spec.type != KeyType.character;
    final flex = switch (widget.spec.type) {
      KeyType.space => 4,
      _ => 1,
    };

    return Expanded(
      flex: flex,
      child: Listener(
        behavior: HitTestBehavior.opaque,
        onPointerDown: (_) {
          setState(() => _pressed = true);
          _showPreview();
        },
        onPointerUp: (_) {
          setState(() => _pressed = false);
          _removePreviewOverlay();
          if (_subKeysOverlay == null) {
            widget.onTap?.call();
          }
        },
        onPointerCancel: (_) {
          setState(() => _pressed = false);
          _removePreviewOverlay();
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onLongPressStart: (details) {
            _selectedSubKeyIndex = -1;
            _showSubKeys();
          },
          onLongPressMoveUpdate: (details) {
            _updateSubKeySelection(details.globalPosition);
          },
          onLongPressEnd: (_) {
            _removeSubKeysOverlay();
            _selectedSubKeyIndex = -1;
          },
          child: Padding(
            key: _keyGlobalKey,
            padding: const EdgeInsets.all(2),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: isSpecial
                    ? (_pressed ? context.colors.level2 : context.colors.level1)
                    : (_pressed ? context.colors.level1 : context.colors.level2),
                borderRadius: BorderRadius.circular(6),
              ),
              child: SizedBox(
                height: 42,
                child: Center(
                  child: widget.spec.icon != null
                      ? Icon(widget.spec.icon, size: 18)
                      : Text(
                          widget.spec.label,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontSize: isSpecial ? 13 : 16,
                          ),
                        ),
                ),
              ),
            ),
        ),
        ),
      ),
    );
  }
}

class _KeyPreviewBubble extends StatelessWidget {
  final String label;
  final Offset keyPosition;
  final Size keySize;

  const _KeyPreviewBubble({
    required this.label,
    required this.keyPosition,
    required this.keySize,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const bubbleWidth = 48.0;
    const bubbleHeight = 56.0;
    const stemHeight = 8.0;

    final left = keyPosition.dx + (keySize.width / 2) - (bubbleWidth / 2);
    final top = keyPosition.dy - bubbleHeight - stemHeight;

    return Positioned(
      left: left,
      top: top,
      child: Column(
        children: [
          Container(
            width: bubbleWidth,
            height: bubbleHeight,
            decoration: BoxDecoration(
              color: context.colors.level2,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(50),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: Text(
                label,
                style: theme.textTheme.headlineMedium,
              ),
            ),
          ),
          CustomPaint(
            size: const Size(bubbleWidth, stemHeight),
            painter: _StemPainter(color: context.colors.level2),
          ),
        ],
      ),
    );
  }
}

class _StemPainter extends CustomPainter {
  final Color color;

  _StemPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(size.width / 2 - 10, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width / 2 + 10, 0)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_StemPainter oldDelegate) => color != oldDelegate.color;
}

class _SubKeyChip extends StatelessWidget {
  final String label;
  final bool isSelected;

  const _SubKeyChip({required this.label, required this.isSelected});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: 40,
      height: 42,
      decoration: BoxDecoration(
        color: isSelected ? theme.colorScheme.primary : context.colors.level2,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Center(
        child: Text(
          label,
          style: theme.textTheme.titleSmall?.copyWith(
            color: isSelected
                ? theme.colorScheme.onPrimary
                : context.colors.onLevel2,
          ),
        ),
      ),
    );
  }
}
