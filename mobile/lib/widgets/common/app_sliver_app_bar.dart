import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class AppSliverAppBar extends StatelessWidget {
  const AppSliverAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.pinned = true,
  });

  final Widget title;
  final Widget? subtitle;
  final List<Widget>? actions;
  final Widget? leading;
  final bool automaticallyImplyLeading;
  final bool pinned;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar.large(
      title: title,
      actions: actions,
      leading: leading,
      automaticallyImplyLeading: automaticallyImplyLeading,
      pinned: pinned,
      expandedHeight: subtitle != null ? 100 : null,
    );
  }

  List<Widget> buildSlivers(BuildContext context) {
    final theme = Theme.of(context);

    return [
      build(context),
      if (subtitle != null)
        SliverToBoxAdapter(
          child: Padding(
            padding: Theming.padding.onlyHorizontal().withTop(8).withBottom(Theming.paddingValue),
            child: DefaultTextStyle(
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withAlpha(153),
              ) ?? const TextStyle(),
              child: subtitle!,
            ),
          ),
        ),
    ];
  }
}
