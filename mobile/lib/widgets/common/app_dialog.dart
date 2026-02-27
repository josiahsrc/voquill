import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class AppDialog extends StatelessWidget {
  const AppDialog({
    super.key,
    this.title,
    required this.content,
    this.actions = const [],
  });

  final Widget? title;
  final Widget content;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      insetPadding: Theming.padding.onlyHorizontal(),
      contentPadding: Theming.padding.onlyVertical(),
      title: title,
      content: SizedBox(width: double.maxFinite, child: content),
      actions: actions,
    );
  }
}
