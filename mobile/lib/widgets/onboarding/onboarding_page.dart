import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/about_you_form.dart';
import 'package:app/widgets/onboarding/try_it_out_form.dart';
import 'package:flutter/material.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final _controller = MultiPageController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: MultiPagePresenter(
        controller: _controller,
        items: [
          MultiPageItem.fromPage(const AboutYouForm()),
          MultiPageItem.fromPage(const TryItOutForm()),
        ],
      ),
    );
  }
}
