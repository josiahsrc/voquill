import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/onboarding/about_you_form.dart';
import 'package:app/widgets/onboarding/create_account_form.dart';
import 'package:app/widgets/onboarding/keyboard_access_form.dart';
import 'package:app/widgets/onboarding/microphone_access_form.dart';
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
          MultiPageItem.fromPage(const CreateAccountForm()),
          MultiPageItem.fromPage(const AboutYouForm()),
          MultiPageItem.fromPage(const MicrophoneAccessForm()),
          MultiPageItem.fromPage(const KeyboardAccessForm()),
          MultiPageItem.fromPage(const ProUnlockedForm()),
          MultiPageItem.fromPage(const OnboardingTryDiscordForm()),
          MultiPageItem.fromPage(const OnboardingTryEmailForm()),
        ],
      ),
    );
  }
}
