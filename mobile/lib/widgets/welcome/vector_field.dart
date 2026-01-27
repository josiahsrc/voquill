import 'dart:math' as math;

import 'package:app/utils/perlin_noise.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

class VectorField extends StatefulWidget {
  const VectorField({super.key});

  @override
  State<VectorField> createState() => _VectorFieldState();
}

class _VectorFieldState extends State<VectorField>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final _perlin = PerlinNoise();
  double _time = 0;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_onTick)..start();
  }

  void _onTick(Duration elapsed) {
    setState(() {
      _time = elapsed.inMilliseconds / 1000.0 * 0.2;
    });
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: IgnorePointer(
        child: CustomPaint(
          painter: VectorFieldPainter(perlin: _perlin, time: _time),
        ),
      ),
    );
  }
}

class VectorFieldPainter extends CustomPainter {
  final PerlinNoise perlin;
  final double time;

  static const _gridSpacing = 40.0;
  static const _noiseScale = 0.0018;
  static const _magScale = 0.01;
  static const _maxVectorLength = 24.0;
  static const _lineWidth = 2.0;

  static const _blueColor = Color(0xFF3B82F6);
  static const _orangeColor = Color(0xFFFF9F1C);

  VectorFieldPainter({required this.perlin, required this.time});

  @override
  void paint(Canvas canvas, Size size) {
    final cols = (size.width / _gridSpacing).ceil() + 1;
    final rows = (size.height / _gridSpacing).ceil() + 1;

    final offsetX = (size.width - (cols - 1) * _gridSpacing) / 2;
    final offsetY = (size.height - (rows - 1) * _gridSpacing) / 2;

    final paint = Paint()
      ..strokeWidth = _lineWidth
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        final x = i * _gridSpacing + offsetX;
        final y = j * _gridSpacing + offsetY;

        final nAngle = perlin.noise(x * _noiseScale, y * _noiseScale, time);
        final angle = nAngle * math.pi * 2;

        final rawMag = perlin.noise(
          x * _magScale + 2000,
          y * _magScale + 2000,
          time,
        );
        final magnitude = (rawMag + 1) / 2;

        final length = magnitude * _maxVectorLength;

        final x1 = x;
        final y1 = y;
        final x2 = x + math.cos(angle) * length;
        final y2 = y + math.sin(angle) * length;

        final color = Color.lerp(_blueColor, _orangeColor, magnitude)!;
        paint.color = color.withValues(alpha: 0.8);

        canvas.drawLine(Offset(x1, y1), Offset(x2, y2), paint);
      }
    }
  }

  @override
  bool shouldRepaint(VectorFieldPainter oldDelegate) {
    return oldDelegate.time != time;
  }
}
