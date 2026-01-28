import 'package:app/theme/app_colors.dart';
import 'package:app/utils/math_utils.dart';
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';

import 'compression.dart';
import 'split_bar.dart';

export 'split_bar.dart' show SplitBarSegment;

const kCollisionPercent = 0.07;

class SplitBarEditor extends StatefulWidget {
  const SplitBarEditor({
    required this.segments,
    super.key,
    this.onChanged,
  });

  final List<SplitBarSegment> segments;
  final ValueChanged<List<double>>? onChanged;

  @override
  State<SplitBarEditor> createState() => _SplitBarEditorState();
}

class _SplitBarEditorState extends State<SplitBarEditor> {
  final List<CompressionController> controllers = [];
  final List<double> thumbNrmValues = [];
  int? draggingThumbIndex;

  double get valueA => 0;

  double get valueB =>
      widget.segments.map((s) => s.value).reduce((a, b) => a + b);

  List<double> computeSegmentValues() {
    final maxValue = valueB;
    final result = <double>[];

    var lastT = 0.0;
    for (var i = 0; i < thumbNrmValues.length; ++i) {
      final nextT = thumbNrmValues[i];
      final lastValue = lastT * maxValue;
      final nextValue = nextT * maxValue;
      final diff = nextValue - lastValue;
      result.add(diff);
      lastT = nextT;
    }

    final lastValue = lastT * maxValue;
    result.add(maxValue - lastValue);

    return result;
  }

  @override
  void initState() {
    syncNrmThumbPoints();
    resolveCollisions();
    super.initState();
  }

  @override
  void dispose() {
    disposeControllers();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant SplitBarEditor oldWidget) {
    if (oldWidget.segments.length != widget.segments.length) {
      syncNrmThumbPoints();
      resolveCollisions();
    }

    super.didUpdateWidget(oldWidget);
  }

  double rangeToNrm(double range) {
    return normalize(range, valueA, valueB);
  }

  double nrmToRange(double nrm) {
    return denormalize(nrm, valueA, valueB);
  }

  void disposeControllers() {
    for (final controller in controllers) {
      controller.dispose();
    }
    controllers.clear();
  }

  void syncNrmThumbPoints() {
    final nThumbs = widget.segments.length - 1;

    final oldThumbValues = List<double>.from(thumbNrmValues);
    final didThumbValuesChange = thumbNrmValues.length != nThumbs;

    disposeControllers();

    // Cache normalized thumb points.
    thumbNrmValues.clear();
    double sum = 0;
    for (int i = 0; i < nThumbs; ++i) {
      final segment = widget.segments[i];
      sum += segment.value;

      double nrm;
      if (didThumbValuesChange) {
        nrm = rangeToNrm(sum);
      } else {
        nrm = oldThumbValues[i];
      }

      thumbNrmValues.add(nrm);
      controllers.add(CompressionController());
    }
  }

  void resolveCollisions([bool forward = true]) {
    final nThumbs = thumbNrmValues.length;
    if (nThumbs == 0) {
      return;
    }

    double prevVal;
    if (forward) {
      prevVal = thumbNrmValues[0];
      for (int i = 1; i < nThumbs; ++i) {
        if (thumbNrmValues[i] < prevVal + kCollisionPercent) {
          thumbNrmValues[i] = prevVal + kCollisionPercent;
        }
        prevVal = thumbNrmValues[i];
      }

      // This might push the last thumb point beyond 1.0, so we need to
      // push everything back the other way
      thumbNrmValues[nThumbs - 1] = thumbNrmValues[nThumbs - 1]
          .clamp(kCollisionPercent, 1 - kCollisionPercent);
      prevVal = thumbNrmValues[nThumbs - 1];
      for (int i = nThumbs - 2; i >= 0; --i) {
        if (thumbNrmValues[i] > prevVal - kCollisionPercent) {
          thumbNrmValues[i] = prevVal - kCollisionPercent;
        }
        prevVal = thumbNrmValues[i];
      }
    } else {
      prevVal = thumbNrmValues[nThumbs - 1];
      for (int i = nThumbs - 2; i >= 0; --i) {
        if (thumbNrmValues[i] > prevVal - kCollisionPercent) {
          thumbNrmValues[i] = prevVal - kCollisionPercent;
        }
        prevVal = thumbNrmValues[i];
      }

      // This might push the first thumb point beyond 0.0, so we need to
      // push everything back the other way
      thumbNrmValues[0] =
          thumbNrmValues[0].clamp(kCollisionPercent, 1 - kCollisionPercent);
      prevVal = thumbNrmValues[0];
      for (int i = 1; i < nThumbs; ++i) {
        if (thumbNrmValues[i] < prevVal + kCollisionPercent) {
          thumbNrmValues[i] = prevVal + kCollisionPercent;
        }
        prevVal = thumbNrmValues[i];
      }
    }
  }

  void emitChange() {
    widget.onChanged?.call(computeSegmentValues());
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: _build);
  }

  Widget _build(
    BuildContext context,
    BoxConstraints constraints,
  ) {
    const thumbWidth = 16.0;
    const pressRadius = 25.0;
    final size = Size(constraints.maxWidth, constraints.maxHeight);
    final segmentValues = computeSegmentValues();
    final totalWeight =
        widget.segments.fold<double>(0, (pv, e) => pv + e.value);

    Offset normalizePoint(Offset loc) {
      return Offset(
        (loc.dx / size.width).clamp(0, 1),
        (loc.dy / size.height).clamp(0, 1),
      );
    }

    void updatePress(Offset nrmPoint) {
      setState(() {
        final prevNrm = thumbNrmValues[draggingThumbIndex!];
        final currNrm = nrmPoint.dx;
        thumbNrmValues[draggingThumbIndex!] = currNrm;
        resolveCollisions(currNrm > prevNrm);
      });
    }

    final width = constraints.maxWidth;
    final thumbPositions = <double>[];

    var currentWeight = 0.0;
    for (int i = 0; i < segmentValues.length - 1; i++) {
      currentWeight += segmentValues[i];
      final percent = currentWeight / totalWeight;
      final position = percent * width - thumbWidth / 2;
      thumbPositions.add(position);
    }

    final barSegments = widget.segments
        .mapIndexed((i, e) => SplitBarSegment(
              value: segmentValues[i],
              color: widget.segments[i].color,
              child: widget.segments[i].child,
            ))
        .toList();

    final bar = Stack(
      children: [
        Positioned.fill(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: SplitBar(segments: barSegments),
          ),
        ),
        for (int i = 0; i < thumbPositions.length; i++)
          Positioned(
            left: thumbPositions[i],
            top: 0,
            bottom: 0,
            child: Compression(
              controller: controllers[i],
              child: Container(
                width: thumbWidth,
                decoration: BoxDecoration(
                  color: context.colors.level1,
                  borderRadius: BorderRadius.circular(thumbWidth / 2),
                  border: Border.all(
                    color: context.colors.onLevel1,
                    width: 2,
                  ),
                ),
              ),
            ),
          ),
      ],
    );

    int? findClosestThumb(double nrmOrigin) {
      if (thumbNrmValues.isEmpty) {
        return null;
      }

      final nThumbs = thumbNrmValues.length;
      var closestIndex = 0;
      var closestDist = double.infinity;
      for (int i = 0; i < nThumbs; ++i) {
        final dist = (thumbNrmValues[i] - nrmOrigin).abs();
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      }

      return closestIndex;
    }

    return GestureDetector(
      onHorizontalDragDown: (event) {
        final nrmPoint = normalizePoint(event.localPosition);
        final thumbIdx = findClosestThumb(nrmPoint.dx);
        if (thumbIdx == null) {
          return;
        }

        final originDx = event.localPosition.dx;
        final thumbDx = thumbNrmValues[thumbIdx] * width;
        if ((thumbDx - originDx).abs() > pressRadius) {
          return;
        }

        setState(() => draggingThumbIndex = thumbIdx);
        controllers[thumbIdx].pressed = true;
      },
      onHorizontalDragStart: (event) {
        if (draggingThumbIndex == null) {
          return;
        }

        final nrmPoint = normalizePoint(event.localPosition);
        updatePress(nrmPoint);
      },
      onHorizontalDragUpdate: (event) {
        if (draggingThumbIndex != null) {
          final localPos = normalizePoint(event.localPosition);
          emitChange();
          updatePress(localPos);
        }
      },
      onHorizontalDragEnd: (event) {
        if (draggingThumbIndex == null) {
          return;
        }
        emitChange();
        controllers[draggingThumbIndex!].pressed = false;
        setState(() => draggingThumbIndex = null);
      },
      onHorizontalDragCancel: () {
        if (draggingThumbIndex == null) {
          return;
        }
        controllers[draggingThumbIndex!].pressed = false;
        setState(() => draggingThumbIndex = null);
      },
      behavior: HitTestBehavior.opaque,
      child: bar,
    );
  }
}
