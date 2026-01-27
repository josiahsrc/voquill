import 'package:app/utils/collection_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class DockedButtonsLayout extends StatelessWidget {
  const DockedButtonsLayout({
    super.key,
    required this.buttons,
    required this.child,
  });

  final List<Widget> buttons;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final theme = Theme.of(context);

    final dockedButtons = ColoredBox(
      color: theme.scaffoldBackgroundColor,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: mq.viewPadding.bottom + Theming.padding.bottom,
          left: mq.viewPadding.left + Theming.padding.left,
          right: mq.viewPadding.right + Theming.padding.right,
          top: Theming.padding.top / 2,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: buttons.joinWith(const SizedBox(height: 4)).toList(),
        ),
      ),
    );

    return MediaQuery.removePadding(
      context: context,
      removeBottom: true,
      child: Column(
        children: [
          Expanded(child: child),
          dockedButtons,
        ],
      ),
    );
  }
}
