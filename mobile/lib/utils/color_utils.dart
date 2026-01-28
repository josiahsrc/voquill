import 'package:flutter/material.dart';

extension ColorX on Color {
  Color withApproxOpacity(double opacity) {
    return withAlpha((opacity.clamp(0, 1) * 255).round());
  }

  Color withLightening(double amount) {
    final hsl = HSLColor.fromColor(this);
    final lightened = hsl.withLightness((hsl.lightness + amount).clamp(0, 1));
    return lightened.toColor();
  }

  Color secondary() {
    final hsl = HSLColor.fromColor(this);
    if (hsl.lightness > 0.5) {
      return withLightening(-0.4);
    } else {
      return withLightening(0.4);
    }
  }

  Color transparent() {
    return withAlpha(0);
  }
}
