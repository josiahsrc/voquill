import 'package:app/widgets/keyboard/keyboard_layout.dart';
import 'package:app/widgets/keyboard/typing_en.dart';
import 'package:flutter/material.dart';

class KeyboardSimulatorPage extends StatelessWidget {
  const KeyboardSimulatorPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Keyboard Simulator')),
      body: SafeArea(
        child: Column(
        children: [
          const Expanded(
            flex: 2,
            child: SizedBox.expand(),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: KeyboardLayout(strategy: TypingEn()),
          ),
        ],
        ),
      ),
    );
  }
}
