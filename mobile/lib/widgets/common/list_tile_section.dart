import 'package:app/theme/app_colors.dart';
import 'package:app/utils/collection_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class ListTileSection extends StatelessWidget {
  const ListTileSection({
    super.key,
    this.title,
    this.errorText,
    this.actions = const [],
    required this.children,
    this.cornerRadius,
    this.padding,
  });

  final Widget? title;
  final String? errorText;
  final List<Widget> actions;
  final List<Widget> children;
  final Radius? cornerRadius;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    final cornerRadius = this.cornerRadius ?? Theming.radius;
    final padding = this.padding ?? EdgeInsets.zero;

    final theme = Theme.of(context);

    final effectiveChildren = applyColumnListTheme(
      context: context,
      children: children,
      topRadius: cornerRadius,
      bottomRadius: cornerRadius,
      backgroundColor: context.colors.level1,
    );

    final topChildren = <Widget>[
      if (title != null)
        DefaultTextStyle(
          style: theme.textTheme.titleMedium ?? const TextStyle(),
          child: title!,
        ),
      const Spacer(),
      ...actions.joinWith(const SizedBox(width: 8)),
    ];

    return Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (topChildren.isNotEmpty) ...[
            Row(
              children: [
                SizedBox(width: Theming.padding.left),
                ...topChildren,
                const SizedBox(width: 12),
              ],
            ),
            const SizedBox(height: 8),
          ],
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.all(cornerRadius),
            ),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.all(cornerRadius),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: effectiveChildren.joinWith(const Divider()).toList(),
              ),
            ),
          ),
          if (errorText != null) ...[
            const SizedBox(height: 8),
            Padding(
              padding: Theming.padding.onlyLeft(),
              child: Text(
                errorText!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
