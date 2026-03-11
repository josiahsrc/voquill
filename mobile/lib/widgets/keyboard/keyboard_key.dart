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
  OverlayEntry? _overlayEntry;
  int _selectedSubKeyIndex = -1;
  final _keyGlobalKey = GlobalKey();

  @override
  void dispose() {
    _removeOverlay();
    super.dispose();
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _showSubKeys() {
    if (widget.spec.subKeys.isEmpty) return;

    final renderBox =
        _keyGlobalKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;
    final subKeys = widget.spec.subKeys;
    final subKeyWidth = 40.0;
    final totalWidth = subKeys.length * subKeyWidth;
    final screenWidth = MediaQuery.of(context).size.width;
    final centered = position.dx + (size.width / 2) - (totalWidth / 2);
    final left = centered.clamp(4.0, screenWidth - totalWidth - 4.0);

    _overlayEntry = OverlayEntry(
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

    Overlay.of(context).insert(_overlayEntry!);
  }

  void _updateSubKeySelection(Offset globalPosition) {
    if (_overlayEntry == null || widget.spec.subKeys.isEmpty) return;

    final renderBox =
        _keyGlobalKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;
    final subKeys = widget.spec.subKeys;
    final subKeyWidth = 40.0;
    final totalWidth = subKeys.length * subKeyWidth;
    final screenWidth = MediaQuery.of(context).size.width;
    final centered = position.dx + (size.width / 2) - (totalWidth / 2);
    final left = centered.clamp(4.0, screenWidth - totalWidth - 4.0);

    final relativeX = globalPosition.dx - left;
    final index = (relativeX / subKeyWidth).floor();

    final newIndex = index.clamp(0, subKeys.length - 1);
    if (newIndex != _selectedSubKeyIndex) {
      setState(() {
        _selectedSubKeyIndex = newIndex;
      });
      _overlayEntry?.markNeedsBuild();
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
      child: GestureDetector(
        onTap: widget.onTap,
        onLongPressStart: (details) {
          _selectedSubKeyIndex = -1;
          _showSubKeys();
        },
        onLongPressMoveUpdate: (details) {
          _updateSubKeySelection(details.globalPosition);
        },
        onLongPressEnd: (_) {
          _removeOverlay();
          _selectedSubKeyIndex = -1;
        },
        child: Padding(
          key: _keyGlobalKey,
          padding: const EdgeInsets.all(2),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: isSpecial ? context.colors.level1 : context.colors.level2,
              borderRadius: BorderRadius.circular(6),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(30),
                  blurRadius: 1,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: SizedBox(
              height: 42,
              child: Center(
                child: Text(
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
    );
  }
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
