import 'package:app/widgets/keyboard/simulator_text_input_proxy.dart';
import 'package:flutter/material.dart';

class SimulatorTextDisplay extends StatefulWidget {
  final SimulatorTextInputProxy proxy;

  const SimulatorTextDisplay({super.key, required this.proxy});

  @override
  State<SimulatorTextDisplay> createState() => _SimulatorTextDisplayState();
}

class _SimulatorTextDisplayState extends State<SimulatorTextDisplay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _cursorBlink;

  @override
  void initState() {
    super.initState();
    _cursorBlink = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 530),
    )..repeat(reverse: true);
    widget.proxy.addListener(_onProxyChanged);
  }

  void _onProxyChanged() {
    setState(() {});
    _cursorBlink
      ..value = 1.0
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    widget.proxy.removeListener(_onProxyChanged);
    _cursorBlink.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _cursorBlink,
      builder: (context, _) {
        return CustomPaint(
          painter: _TextDisplayPainter(
            text: widget.proxy.text,
            cursorOffset: widget.proxy.cursorOffset,
            cursorOpacity: _cursorBlink.value,
            style: Theme.of(context).textTheme.bodyLarge ??
                const TextStyle(fontSize: 16),
            cursorColor: Theme.of(context).colorScheme.primary,
          ),
          size: Size.infinite,
        );
      },
    );
  }
}

class _TextDisplayPainter extends CustomPainter {
  final String text;
  final int cursorOffset;
  final double cursorOpacity;
  final TextStyle style;
  final Color cursorColor;

  _TextDisplayPainter({
    required this.text,
    required this.cursorOffset,
    required this.cursorOpacity,
    required this.style,
    required this.cursorColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final textPainter = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
      maxLines: null,
    )..layout(maxWidth: size.width);

    textPainter.paint(canvas, Offset.zero);

    final cursorPosition = textPainter.getOffsetForCaret(
      TextPosition(offset: cursorOffset),
      Rect.zero,
    );

    final cursorHeight = style.fontSize! * (style.height ?? 1.2);
    final cursorPaint = Paint()
      ..color = cursorColor.withAlpha((255 * cursorOpacity).toInt())
      ..strokeWidth = 2;

    canvas.drawLine(
      cursorPosition,
      cursorPosition + Offset(0, cursorHeight),
      cursorPaint,
    );
  }

  @override
  bool shouldRepaint(_TextDisplayPainter old) =>
      text != old.text ||
      cursorOffset != old.cursorOffset ||
      cursorOpacity != old.cursorOpacity;
}
