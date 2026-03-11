import 'package:app/widgets/keyboard/keyboard_key.dart';
import 'package:app/widgets/keyboard/keyboard_types.dart';
import 'package:app/widgets/keyboard/text_input_proxy.dart';
import 'package:app/widgets/keyboard/typing_strategy.dart';
import 'package:flutter/material.dart';

class KeyboardLayout extends StatefulWidget {
  final TypingStrategy strategy;
  final TextInputProxy proxy;

  const KeyboardLayout({
    super.key,
    required this.strategy,
    required this.proxy,
  });

  @override
  State<KeyboardLayout> createState() => _KeyboardLayoutState();
}

class _KeyboardLayoutState extends State<KeyboardLayout> {
  late String _mode;

  @override
  void initState() {
    super.initState();
    _mode = widget.strategy.initialMode;
  }

  void _onKeyTap(KeySpec spec) {
    if (spec.type == KeyType.modeSwitch && spec.targetMode != null) {
      setState(() => _mode = spec.targetMode!);
      return;
    }

    if (spec.type == KeyType.shift) {
      setState(() {
        _mode = widget.strategy.onModeTransition(_mode, KeyType.shift);
      });
      return;
    }

    widget.strategy.onKeyTap(spec, widget.proxy);
  }

  @override
  Widget build(BuildContext context) {
    final rows = widget.strategy.layouts[_mode] ?? [];

    return Column(
      children: [
        for (final row in rows)
          _KeyboardRow(
            row: row,
            onKeyTap: _onKeyTap,
            onSubKeySelected: (spec, value) =>
                _onKeyTap(spec.copyWithValue(value)),
            onCursorMove: (offset) => widget.proxy.moveCursor(offset),
          ),
      ],
    );
  }
}

class _KeyboardRow extends StatelessWidget {
  final List<KeySpec> row;
  final ValueChanged<KeySpec> onKeyTap;
  final void Function(KeySpec spec, String value) onSubKeySelected;
  final ValueChanged<int> onCursorMove;

  const _KeyboardRow({
    required this.row,
    required this.onKeyTap,
    required this.onSubKeySelected,
    required this.onCursorMove,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Row(
        children: [
          for (final spec in row)
            KeyboardKey(
              spec: spec,
              onTap: () => onKeyTap(spec),
              onSubKeySelected: (value) => onSubKeySelected(spec, value),
              onCursorMove: onCursorMove,
            ),
        ],
      ),
    );
  }
}
