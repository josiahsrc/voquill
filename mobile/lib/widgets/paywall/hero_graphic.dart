import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_svg/flutter_svg.dart';

const _baseText =
    "So I've been working on this really cool flower garden project lately. "
    "I'm growing sunflowers, lavender, and these amazing dahlias that just "
    "started blooming. The colors are incredible and I can't wait to show you "
    "the photos. ";

final _repeatedText = List.generate(10, (_) => _baseText).join();

double _seededRandom(double seed) {
  final x = sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - x.floorToDouble();
}

class _Curve {
  final Offset start, cp1, cp2, end;
  const _Curve(this.start, this.cp1, this.cp2, this.end);
}

({double x, double y, double angle}) _bezierAt(_Curve c, double t) {
  final mt = 1 - t;
  final mt2 = mt * mt;
  final mt3 = mt2 * mt;
  final t2 = t * t;
  final t3 = t2 * t;

  final x =
      mt3 * c.start.dx +
      3 * mt2 * t * c.cp1.dx +
      3 * mt * t2 * c.cp2.dx +
      t3 * c.end.dx;
  final y =
      mt3 * c.start.dy +
      3 * mt2 * t * c.cp1.dy +
      3 * mt * t2 * c.cp2.dy +
      t3 * c.end.dy;

  final dx =
      3 * mt2 * (c.cp1.dx - c.start.dx) +
      6 * mt * t * (c.cp2.dx - c.cp1.dx) +
      3 * t2 * (c.end.dx - c.cp2.dx);
  final dy =
      3 * mt2 * (c.cp1.dy - c.start.dy) +
      6 * mt * t * (c.cp2.dy - c.cp1.dy) +
      3 * t2 * (c.end.dy - c.cp2.dy);

  return (x: x, y: y, angle: atan2(dy, dx));
}

const _vw = 1000.0;
const _vh = 750.0;
const _cx = _vw;
const _cy = _vh;

final _inputCurve = _Curve(
  Offset(_cx - _vw * 0.1, -50),
  Offset(_cx + _vw * 0.2, _cy - _vh * 0.8),
  Offset(_cx - _vw * 0.5, _cy - _vh * 0.1),
  Offset(_cx - 28, _cy - 5),
);

final _outputCurve = _Curve(
  Offset(_cx + 5, _cy),
  Offset(_cx + _vw * 0.4, _cy + _vh * 0.1),
  Offset(_cx, _cy + _vh * 0.4),
  Offset(_cx + _vw * 0.7, _cy + _vh * 0.5),
);

const _waves = [
  (freq: 16 / 3, amp: 14.0, dur: 1.5, opacity: 0.5),
  (freq: 24 / 3, amp: 10.0, dur: 1.2, opacity: 0.35),
  (freq: 36 / 3, amp: 6.0, dur: 1.0, opacity: 0.25),
];

final _sparks = List.generate(6, (i) {
  final angle = _seededRandom(i * 3.3) * pi * 2;
  final distance = 80 + _seededRandom(i * 4.4) * 60;
  return (
    tx: cos(angle) * distance,
    ty: sin(angle) * distance,
    delay: _seededRandom(i * 1.1) * 2,
    dur: 0.6 + _seededRandom(i * 2.2) * 0.5,
  );
});

const _zoom = 4.0;

class _ViewTransform {
  late final double _scale;
  late final double _ox;
  late final double _oy;

  _ViewTransform(Size size, {double topPadding = 0}) {
    if (size.isEmpty) {
      _scale = 1;
      _ox = 0;
      _oy = 0;
      return;
    }
    _scale = max(size.width / 2000, size.height / 1500) * _zoom;
    _ox = size.width / 2 - _cx * _scale;
    _oy = (size.height + topPadding) / 2 - _cy * _scale;
  }

  Offset toScreen(double x, double y) =>
      Offset(_ox + x * _scale, _oy + y * _scale);
  double scaleValue(double v) => v * _scale;
}

class HeroGraphic extends StatefulWidget {
  const HeroGraphic({super.key});

  @override
  State<HeroGraphic> createState() => _HeroGraphicState();
}

class _HeroGraphicState extends State<HeroGraphic>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final _elapsed = ValueNotifier<double>(0);

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((d) {
      _elapsed.value = d.inMicroseconds / 1e6;
    })..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _elapsed.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final topPadding = MediaQuery.of(context).padding.top * (2 / 3);

    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        final vt = _ViewTransform(size, topPadding: topPadding);
        final iconPos = vt.toScreen(_cx, _cy);
        final logoSize = vt.scaleValue(40);

        return ClipRect(
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _HeroGraphicPainter(
                    elapsed: _elapsed,
                    isDark: isDark,
                    topPadding: topPadding,
                  ),
                ),
              ),
              if (logoSize > 0)
                Positioned(
                  left: iconPos.dx - logoSize / 2,
                  top: iconPos.dy - logoSize / 2,
                  width: logoSize,
                  height: logoSize,
                  child: isDark
                      ? SvgPicture.asset('assets/app_logo.svg')
                      : ColorFiltered(
                          colorFilter: const ColorFilter.matrix(<double>[
                            -1,
                            0,
                            0,
                            0,
                            255,
                            0,
                            -1,
                            0,
                            0,
                            255,
                            0,
                            0,
                            -1,
                            0,
                            255,
                            0,
                            0,
                            0,
                            1,
                            0,
                          ]),
                          child: SvgPicture.asset('assets/app_logo.svg'),
                        ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _HeroGraphicPainter extends CustomPainter {
  final ValueNotifier<double> elapsed;
  final bool isDark;
  final double topPadding;

  static final _darkCharCache = <String, (ui.Paragraph, double)>{};
  static final _lightCharCache = <String, (ui.Paragraph, double)>{};

  _HeroGraphicPainter({
    required this.elapsed,
    required this.isDark,
    required this.topPadding,
  }) : super(repaint: elapsed);

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;

    final s = max(size.width / 2000, size.height / 1500) * _zoom;
    final ox = size.width / 2 - _cx * s;
    final oy = (size.height + topPadding) / 2 - _cy * s;

    canvas.save();
    canvas.translate(ox, oy);
    canvas.scale(s);

    final t = elapsed.value;
    _drawWaves(canvas, t);
    _drawText(canvas, t);
    _drawSparks(canvas, t);
    _drawIconBase(canvas);

    canvas.restore();
  }

  void _drawWaves(Canvas canvas, double t) {
    final color = isDark ? Colors.white : Colors.black;

    for (final w in _waves) {
      final timeOffset = (t / w.dur) * pi * 2;
      final path = Path();

      for (int i = 0; i <= 100; i++) {
        final s = i / 100;
        final bp = _bezierAt(_inputCurve, s);

        final perpX = -sin(bp.angle);
        final perpY = cos(bp.angle);
        final phase = s * w.freq * pi * 2 - timeOffset;
        final sineVal = sin(phase) * w.amp;
        final fadeIn = min(1.0, s * 5);
        final fadeOut = min(1.0, (1 - s) * 5);
        final fade = fadeIn * fadeOut;

        final px = bp.x + perpX * sineVal * fade;
        final py = bp.y + perpY * sineVal * fade;

        if (i == 0) {
          path.moveTo(px, py);
        } else {
          path.lineTo(px, py);
        }
      }

      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..color = color.withAlpha((w.opacity * 255).round()),
      );
    }
  }

  void _drawText(Canvas canvas, double t) {
    final outputPath = Path()
      ..moveTo(_outputCurve.start.dx, _outputCurve.start.dy)
      ..cubicTo(
        _outputCurve.cp1.dx,
        _outputCurve.cp1.dy,
        _outputCurve.cp2.dx,
        _outputCurve.cp2.dy,
        _outputCurve.end.dx,
        _outputCurve.end.dy,
      );

    final metrics = outputPath.computeMetrics().toList();
    if (metrics.isEmpty) return;
    final metric = metrics.first;
    final pathLen = metric.length;

    double baseWidth = 0;
    for (int i = 0; i < _baseText.length; i++) {
      final (_, w) = _getCharParagraph(_baseText[i]);
      baseWidth += w;
    }
    if (baseWidth <= 0) return;

    final scroll = (1.0 - t / 15.5 % 1.0) * baseWidth;
    double d = -scroll;

    for (int i = 0; i < _repeatedText.length; i++) {
      final (para, charW) = _getCharParagraph(_repeatedText[i]);

      if (d > pathLen) break;
      if (d >= 0) {
        final tangent = metric.getTangentForOffset(d);
        if (tangent != null) {
          canvas.save();
          canvas.translate(tangent.position.dx, tangent.position.dy);
          canvas.rotate(-tangent.angle);
          canvas.drawParagraph(para, Offset(0, -para.height / 2));
          canvas.restore();
        }
      }

      d += charW;
    }
  }

  (ui.Paragraph, double) _getCharParagraph(String char) {
    final cache = isDark ? _darkCharCache : _lightCharCache;
    return cache.putIfAbsent(char, () {
      final style = ui.TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: (isDark ? Colors.white : Colors.black).withAlpha(179),
      );
      final builder =
          ui.ParagraphBuilder(
              ui.ParagraphStyle(textDirection: TextDirection.ltr),
            )
            ..pushStyle(style)
            ..addText(char);
      final para = builder.build()
        ..layout(const ui.ParagraphConstraints(width: 100));
      final w = para.maxIntrinsicWidth;
      return (para, w > 1 ? w : 4.0);
    });
  }

  void _drawSparks(Canvas canvas, double t) {
    final baseColor = isDark ? Colors.white : Colors.black;

    for (final spark in _sparks) {
      if (t < spark.delay) continue;
      final p = ((t - spark.delay) % spark.dur) / spark.dur;

      canvas.drawCircle(
        Offset(_cx + spark.tx * p, _cy + spark.ty * p),
        3.0 - 2.0 * p,
        Paint()..color = baseColor.withAlpha((0.6 * (1 - p) * 255).round()),
      );
    }
  }

  void _drawIconBase(Canvas canvas) {
    canvas.drawCircle(
      const Offset(_cx, _cy),
      38,
      Paint()
        ..color = (isDark ? Colors.white : Colors.black).withAlpha(
          isDark ? 20 : 10,
        )
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
    );

    canvas.drawCircle(
      const Offset(_cx, _cy),
      30,
      Paint()..color = isDark ? Colors.white : const Color(0xFF111111),
    );
  }

  @override
  bool shouldRepaint(_HeroGraphicPainter old) =>
      isDark != old.isDark || topPadding != old.topPadding;
}
