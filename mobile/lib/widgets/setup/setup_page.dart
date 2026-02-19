import 'package:app/utils/analytics_utils.dart';
import 'package:app/widgets/common/multi_page_presenter.dart';
import 'package:app/widgets/setup/setup_intro_form.dart';
import 'package:app/widgets/setup/setup_keyboard_form.dart';
import 'package:app/widgets/setup/setup_microphone_form.dart';
import 'package:flutter/material.dart';

class SetupPage extends StatefulWidget {
  const SetupPage({super.key});

  @override
  State<SetupPage> createState() => _SetupPageState();
}

class _SetupPageState extends State<SetupPage> {
  final _controller = MultiPageController();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onPageChanged);
  }

  void _onPageChanged() {
    trackSetupStep(_controller.target);
  }

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
          MultiPageItem.fromPage(const SetupIntroForm()),
          MultiPageItem.fromPage(const SetupMicrophoneForm()),
          MultiPageItem.fromPage(const SetupKeyboardForm()),
        ],
      ),
    );
  }
}
