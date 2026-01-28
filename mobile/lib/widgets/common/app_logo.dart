import 'package:app/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class AppLogo extends StatelessWidget {
  final double size;
  final Color? color;

  const AppLogo({super.key, this.size = 48, this.color});

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? context.colors.primary;

    return SvgPicture.asset(
      'assets/app_logo.svg',
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(effectiveColor, BlendMode.srcIn),
    );
  }
}
