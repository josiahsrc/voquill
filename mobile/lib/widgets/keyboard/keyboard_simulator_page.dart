import 'package:app/widgets/keyboard/keyboard_layout.dart';
import 'package:app/widgets/keyboard/simulator_text_display.dart';
import 'package:app/widgets/keyboard/simulator_text_input_proxy.dart';
import 'package:app/widgets/keyboard/typing_en.dart';
import 'package:flutter/material.dart';

class KeyboardSimulatorPage extends StatefulWidget {
  const KeyboardSimulatorPage({super.key});

  @override
  State<KeyboardSimulatorPage> createState() => _KeyboardSimulatorPageState();
}

class _KeyboardSimulatorPageState extends State<KeyboardSimulatorPage> {
  final _proxy = SimulatorTextInputProxy();

  @override
  void dispose() {
    _proxy.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Keyboard Simulator')),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SimulatorTextDisplay(proxy: _proxy),
              ),
            ),
            TextFormField(),
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: KeyboardLayout(strategy: TypingEn(), proxy: _proxy),
            ),
          ],
        ),
      ),
    );
  }
}
