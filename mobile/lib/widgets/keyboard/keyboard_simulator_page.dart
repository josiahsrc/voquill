import 'package:flutter/material.dart';

class KeyboardSimulatorPage extends StatelessWidget {
  const KeyboardSimulatorPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Keyboard Simulator')),
      body: Column(
        children: [
          const Expanded(
            flex: 2,
            child: SizedBox.expand(),
          ),
          Flexible(
            flex: 1,
            child: Container(),
          ),
        ],
      ),
    );
  }
}
