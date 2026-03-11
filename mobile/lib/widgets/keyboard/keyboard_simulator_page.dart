import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:flutter/material.dart';

class KeyboardSimulatorPage extends StatelessWidget {
  const KeyboardSimulatorPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [const AppSliverAppBar(title: Text('Keyboard Simulator'))],
      ),
    );
  }
}
