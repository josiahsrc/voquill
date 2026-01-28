import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/docked_buttons_layout.dart';
import 'package:app/widgets/common/intrinsic_scroller.dart';
import 'package:flutter/material.dart';

class OnboardingFormLayout extends StatelessWidget {
  const OnboardingFormLayout({
    super.key,
    this.backButton,
    required this.child,
    required this.actions,
  });

  final Widget? backButton;
  final Widget child;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: false, leading: backButton),
      body: DockedButtonsLayout(buttons: actions, child: child),
    );
  }
}

class OnboardingBody extends StatelessWidget {
  const OnboardingBody({
    super.key,
    required this.title,
    required this.description,
    required this.child,
  });

  final Widget title;
  final Widget description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return IntrinsicScroller(
      padding: Theming.padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DefaultTextStyle(
            style: theme.textTheme.headlineMedium!,
            child: title,
          ),
          const SizedBox(height: 8),
          DefaultTextStyle(
            style: theme.textTheme.bodyMedium!,
            child: description,
          ),
          const SizedBox(height: 24),
          Expanded(child: child),
        ],
      ),
    );
  }
}
