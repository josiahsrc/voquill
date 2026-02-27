import 'package:app/utils/color_utils.dart';
import 'package:flutter/material.dart';

import 'app_list_tile.dart';

class AppCheckboxListTile extends StatelessWidget {
  const AppCheckboxListTile({
    super.key,
    this.leading,
    this.title,
    this.subtitle,
    this.onChanged,
    required this.value,
    this.fillColor,
    this.checkColor,
    this.leadingSpacing,
    this.fade,
    this.footer,
    this.secondary,
  });

  final Widget? leading;
  final Widget? title;
  final Widget? subtitle;
  final ValueChanged<bool?>? onChanged;
  final bool value;
  final Color? fillColor;
  final Color? checkColor;
  final double? leadingSpacing;
  final bool? fade;
  final Widget? footer;
  final Widget? secondary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fade = this.fade ?? false;

    final checkbox = Checkbox(
      value: value,
      onChanged: onChanged,
      checkColor: checkColor,
      fillColor: WidgetStateProperty.resolveWith((states) {
        final color = fillColor ?? theme.colorScheme.primary;
        if (states.contains(WidgetState.disabled)) {
          return color.withApproxOpacity(0.12);
        }
        if (states.contains(WidgetState.selected)) {
          return color;
        }
        return color.withApproxOpacity(0.0);
      }),
    );

    Widget? maybeFadeWidget(Widget? child) {
      if (child == null) {
        return null;
      }

      if (!fade) {
        return child;
      }

      return AnimatedOpacity(
        duration: kThemeChangeDuration,
        opacity: value ? 1.0 : 0.5,
        child: child,
      );
    }

    return AppListTile(
      highlighted: value,
      leading: checkbox,
      title: maybeFadeWidget(title),
      onTap: onChanged == null ? null : () => onChanged!(!value),
      subtitle: maybeFadeWidget(subtitle),
      leadingSpacing: leadingSpacing ?? kAppListTileInkSpacing,
      trailing: maybeFadeWidget(secondary),
      footer: maybeFadeWidget(footer),
    );
  }
}
