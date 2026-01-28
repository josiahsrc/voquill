import 'dart:ui';

double normalize(double val, double min, double max) {
  final absmin = min.abs();

  double res;
  if (min > 0) {
    res = (val - absmin) / (max - absmin);
  } else {
    res = (val + absmin) / (max + absmin);
  }

  return res.clamp(0.0, 1.0);
}

double denormalize(double nrm, double min, double max) {
  return lerpDouble(min, max, nrm)!.clamp(min, max);
}
