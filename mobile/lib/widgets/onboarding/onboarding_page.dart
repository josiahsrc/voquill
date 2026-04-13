import 'package:app/utils/analytics_utils.dart';
import 'package:app/actions/onboarding_actions.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/about_you_form.dart';
import 'package:app/widgets/onboarding/create_account_form.dart';
import 'package:app/widgets/onboarding/keyboard_access_form.dart';
import 'package:app/widgets/onboarding/microphone_access_form.dart';
import 'package:app/widgets/onboarding/demo_form.dart';
import 'package:app/widgets/onboarding/onboarding_try_discord_form.dart';
import 'package:app/widgets/onboarding/onboarding_try_email_form.dart';
import 'package:app/widgets/onboarding/pro_unlocked_form.dart';
import 'package:flutter/material.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  late MultiPageController _controller;

  @override
  void initState() {
    super.initState();
    _controller = MultiPageController();
    _controller.addListener(_handleControllerChanged);
    _restore();
  }

  Future<void> _restore() async {
    final saved = await restoreOnboardingProgress();
    if (!mounted || saved == null) return;
    final controller = MultiPageController.restore(
      target: saved.target,
      history: saved.history,
    );
    controller.addListener(_handleControllerChanged);
    setState(() {
      _controller.removeListener(_handleControllerChanged);
      _controller.dispose();
      _controller = controller;
    });
  }

  void _handleControllerChanged() {
    _onPageChanged(_controller);
  }

  void _onPageChanged(MultiPageController controller) {
    trackOnboardingStep(controller.target);
    persistOnboardingNavigation(
      target: controller.target,
      history: controller.history,
    );
  }

  @override
  void dispose() {
    _controller.removeListener(_handleControllerChanged);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: MultiPagePresenter(
        controller: _controller,
        items: [
          MultiPageItem.fromPage(const CreateAccountForm()),
          MultiPageItem.fromPage(const AboutYouForm()),
          MultiPageItem.fromPage(const MicrophoneAccessForm()),
          MultiPageItem.fromPage(const KeyboardAccessForm()),
          MultiPageItem.fromPage(const ProUnlockedForm()),
          MultiPageItem.fromPage(const DemoForm()),
          MultiPageItem.fromPage(const OnboardingTryDiscordForm()),
          MultiPageItem.fromPage(const OnboardingTryEmailForm()),
        ],
      ),
    );
  }
}
