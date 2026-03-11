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
        for (final keyRow in rows)
          _KeyboardRow(
            keyRow: keyRow,
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
  final KeyRow keyRow;
  final ValueChanged<KeySpec> onKeyTap;
  final void Function(KeySpec spec, String value) onSubKeySelected;
  final ValueChanged<int> onCursorMove;

  const _KeyboardRow({
    required this.keyRow,
    required this.onKeyTap,
    required this.onSubKeySelected,
    required this.onCursorMove,
  });

  List<double> _computeWidths(double available) {
    final keys = keyRow.keys;
    final widths = List<double>.filled(keys.length, 0);
    final totalWeight = keys.fold(0, (sum, k) => sum + k.weight);
    var remaining = available;
    var remainingWeight = totalWeight;

    // First pass: clamp keys that have a maxWidth
    for (var i = 0; i < keys.length; i++) {
      final proportional = remaining * keys[i].weight / remainingWeight;
      if (keys[i].maxWidth != null && proportional > keys[i].maxWidth!) {
        widths[i] = keys[i].maxWidth!;
        remaining -= widths[i];
        remainingWeight -= keys[i].weight;
      }
    }

    // Second pass: distribute remaining space to unclamped keys
    for (var i = 0; i < keys.length; i++) {
      if (widths[i] == 0) {
        widths[i] = remaining * keys[i].weight / remainingWeight;
      }
    }

    return widths;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final widths = _computeWidths(constraints.maxWidth);
          return Row(
            mainAxisAlignment: keyRow.alignment,
            children: [
              for (var i = 0; i < keyRow.keys.length; i++)
                if (keyRow.keys[i].type == KeyType.spacer)
                  SizedBox(width: widths[i])
                else
                  SizedBox(
                    width: widths[i],
                    child: KeyboardKey(
                      spec: keyRow.keys[i],
                      onTap: () => onKeyTap(keyRow.keys[i]),
                      onSubKeySelected: (value) =>
                          onSubKeySelected(keyRow.keys[i], value),
                      onCursorMove: onCursorMove,
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}
