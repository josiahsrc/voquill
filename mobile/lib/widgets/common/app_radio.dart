import 'package:flutter/material.dart';

class AppRadio extends StatelessWidget {
  const AppRadio(this.selected, {super.key});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    return RadioGroup<bool>(
      groupValue: selected,
      onChanged: (_) {},
      child: const Radio<bool>(value: true),
    );
  }
}
