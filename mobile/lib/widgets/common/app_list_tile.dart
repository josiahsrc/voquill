import 'package:app/utils/color_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

const kAppListTileInkSpacing = 12.0;

class AppListTileThemeData {
  const AppListTileThemeData({this.leadingSpacing, this.trailingSpacing});

  const AppListTileThemeData.fallback()
    : leadingSpacing = null,
      trailingSpacing = null;

  final double? leadingSpacing;
  final double? trailingSpacing;
}

class AppListTileTheme extends StatelessWidget {
  const AppListTileTheme({super.key, required this.data, required this.child});

  final AppListTileThemeData data;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Provider.value(value: data, child: child);
  }

  static AppListTileThemeData of(BuildContext context) {
    try {
      return Provider.of<AppListTileThemeData>(context);
    } on ProviderNotFoundException {
      return const AppListTileThemeData.fallback();
    }
  }
}

enum AppListTileVariant {
  primary,
  warning;

  bool get isPrimary => this == AppListTileVariant.primary;
  bool get isWarning => this == AppListTileVariant.warning;
}

/// I ran into several issues with Flutter's [ListTile]. Created a custom one
/// to allow more customization unique to this app.
class AppListTile extends StatelessWidget {
  const AppListTile({
    super.key,
    this.leading,
    this.trailing,
    this.contentPadding,
    this.title,
    this.subtitle,
    this.footer,
    this.onTap,
    this.highlighted,
    this.trailingSpacing,
    this.beforeTrailingSpacing,
    this.leadingSpacing,
    this.afterLeadingSpacing,
    this.variant,
    this.backgroundColor,
  }) : labeled = false;

  final Widget? leading;
  final Widget? trailing;
  final EdgeInsets? contentPadding;
  final Widget? title;
  final Widget? subtitle;
  final Widget? footer;
  final VoidCallback? onTap;
  final bool? highlighted;
  final double? trailingSpacing;
  final double? beforeTrailingSpacing;
  final double? leadingSpacing;
  final double? afterLeadingSpacing;
  final AppListTileVariant? variant;
  final bool? labeled;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final radiusGeom = getListTileBorderRadiusFromContext(context);
    final directionality = Directionality.of(context);
    final radius = radiusGeom?.resolve(directionality) ?? BorderRadius.zero;
    final innerTheme = AppListTileTheme.of(context);
    final labeled = this.labeled ?? false;

    final eTrailingSpacing =
        trailingSpacing ?? innerTheme.trailingSpacing ?? Theming.paddingValue;
    final eLeadingSpacing =
        leadingSpacing ?? innerTheme.leadingSpacing ?? Theming.paddingValue;

    final eBeforeTrailingSpacing =
        beforeTrailingSpacing ?? Theming.paddingValue;
    final eAfterLeadingSpacing = afterLeadingSpacing ?? Theming.paddingValue;

    double minHeight;
    EdgeInsets fallbackContentPadding;
    if (footer != null) {
      minHeight = 72;
      fallbackContentPadding = Theming.padding.withVertical(10);
    } else if (subtitle != null) {
      minHeight = 64;
      fallbackContentPadding = Theming.padding.withVertical(10);
    } else {
      minHeight = 64;
      fallbackContentPadding = Theming.padding.withVertical(4);
    }

    fallbackContentPadding = fallbackContentPadding.copyWith(
      left: eLeadingSpacing,
      right: eTrailingSpacing,
    );

    Color? foregroundColor;
    if (variant?.isWarning == true) {
      foregroundColor = theme.colorScheme.error;
    }

    Widget? effectiveLeading;
    if (leading != null) {
      final baseLeadingStyle =
          theme.listTileTheme.titleTextStyle ??
          theme.textTheme.bodyMedium ??
          const TextStyle();
      effectiveLeading = DefaultTextStyle(
        style: baseLeadingStyle.copyWith(
          color: (foregroundColor ?? theme.colorScheme.onSurface)
              .withApproxOpacity(0.5),
        ),
        child: IconTheme(
          data: theme.iconTheme.copyWith(color: foregroundColor),
          child: leading!,
        ),
      );
    }

    final subtitleStyle =
        (theme.textTheme.bodyMedium?.secondary() ?? const TextStyle()).copyWith(
          color: foregroundColor,
        );

    final titleStyle = (theme.textTheme.titleMedium ?? const TextStyle())
        .copyWith(color: foregroundColor);

    Widget? effectiveSubtitle;
    if (subtitle != null) {
      effectiveSubtitle = DefaultTextStyle(
        style: labeled ? titleStyle : subtitleStyle,
        child: subtitle!,
      );
    }

    Widget? effectiveTitle;
    if (title != null) {
      effectiveTitle = DefaultTextStyle(
        style: labeled ? subtitleStyle : titleStyle,
        child: title!,
      );
    }

    Widget? effectiveFooter;
    if (footer != null) {
      effectiveFooter = DefaultTextStyle(
        style: (theme.textTheme.bodyMedium?.secondary() ?? const TextStyle())
            .copyWith(color: foregroundColor),
        child: footer!,
      );
    }

    Widget? effectiveTrailing;
    if (trailing != null) {
      effectiveTrailing = IconTheme(
        data: theme.iconTheme.copyWith(color: foregroundColor),
        child: trailing!,
      );
    }

    final content = Row(
      children: [
        if (effectiveLeading != null) ...[
          effectiveLeading,
          SizedBox(width: eAfterLeadingSpacing),
        ],
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (effectiveTitle != null) effectiveTitle,
              if (effectiveSubtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: effectiveSubtitle,
                ),
              if (effectiveFooter != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: effectiveFooter,
                ),
            ],
          ),
        ),
        if (effectiveTrailing != null) ...[
          SizedBox(width: eBeforeTrailingSpacing),
          effectiveTrailing,
        ],
      ],
    );

    return Container(
      decoration: BoxDecoration(
        color:
            backgroundColor ??
            (highlighted == true
                ? theme.highlightColor
                : theme.listTileTheme.tileColor ??
                      theme.scaffoldBackgroundColor),
        borderRadius: radiusGeom,
      ),
      constraints: BoxConstraints(minHeight: minHeight),
      child: Material(
        type: MaterialType.transparency,
        borderRadius: radiusGeom,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Padding(
            padding: contentPadding ?? fallbackContentPadding,
            child: content,
          ),
        ),
      ),
    );
  }
}
