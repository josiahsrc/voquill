import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class AppDismissible extends StatelessWidget {
  const AppDismissible({
    required Key super.key,
    required this.child,
    required this.onDismissed,
  });

  final Widget child;
  final DismissDirectionCallback onDismissed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final radius = getListTileBorderRadiusFromContext(context);

    return Dismissible(
      key: key!,
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        decoration: BoxDecoration(
          color: theme.colorScheme.error,
          borderRadius: radius,
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: onDismissed,
      child: child,
    );
  }
}
