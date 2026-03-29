import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

const _tau = 2 * pi;
const _levelSmoothing = 0.18;
const _targetDecayPerFrame = 0.985;
const _waveBasePhaseStep = 0.11;
const _wavePhaseGain = 0.32;
const _minAmplitude = 0.03;
const _maxAmplitude = 1.3;

const _waveConfigs = [
  (frequency: 0.8, multiplier: 1.6, phaseOffset: 0.0, opacity: 1.0),
  (frequency: 1.0, multiplier: 1.35, phaseOffset: 0.85, opacity: 0.78),
  (frequency: 1.25, multiplier: 1.05, phaseOffset: 1.7, opacity: 0.56),
];

class AudioWaveform extends StatefulWidget {
  const AudioWaveform({
    super.key,
    required this.audioLevel,
    required this.active,
    this.strokeColor,
    this.strokeWidth = 3,
  });

  final double audioLevel;
  final bool active;
  final Color? strokeColor;
  final double strokeWidth;

  @override
  State<AudioWaveform> createState() => _AudioWaveformState();
}

class _AudioWaveformState extends State<AudioWaveform>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  double _phase = 0;
  double _currentLevel = 0;
  double _targetLevel = 0;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_onTick)..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  void _onTick(Duration elapsed) {
    if (widget.active) {
      _targetLevel = min(1, _targetLevel * 0.25 + widget.audioLevel * 0.75);
    } else {
      _targetLevel = 0;
      _currentLevel *= 0.92;
    }

    _currentLevel += (_targetLevel - _currentLevel) * _levelSmoothing;
    _targetLevel *= _targetDecayPerFrame;

    if (_currentLevel < 0.001) _currentLevel = 0;
    if (_targetLevel < 0.001) _targetLevel = 0;

    final level = max(0.0, _currentLevel);
    _phase = (_phase + _waveBasePhaseStep + _wavePhaseGain * level) % _tau;

    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.strokeColor ?? Theme.of(context).colorScheme.primary;

    return CustomPaint(
      painter: _WaveformPainter(
        phase: _phase,
        level: _currentLevel,
        strokeColor: color,
        strokeWidth: widget.strokeWidth,
      ),
      size: Size.infinite,
    );
  }
}

class _WaveformPainter extends CustomPainter {
  _WaveformPainter({
    required this.phase,
    required this.level,
    required this.strokeColor,
    required this.strokeWidth,
  });

  final double phase;
  final double level;
  final Color strokeColor;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final baseline = size.height / 2;
    final segments = max(72, size.width ~/ 2);

    for (final config in _waveConfigs) {
      final amplitudeFactor = (level * config.multiplier).clamp(
        _minAmplitude,
        _maxAmplitude,
      );
      final amplitude = max(1.0, size.height * 0.75 * amplitudeFactor);
      final wavePhase = phase + config.phaseOffset;

      final paint = Paint()
        ..color = strokeColor.withValues(alpha: config.opacity)
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      final path = Path();
      for (var i = 0; i <= segments; i++) {
        final t = i / segments;
        final x = size.width * t;
        final theta = config.frequency * t * _tau + wavePhase;
        final y = baseline + amplitude * sin(theta);

        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }

      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_WaveformPainter oldDelegate) => true;
}
