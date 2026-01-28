import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AdaptiveText extends StatelessWidget {
  const AdaptiveText(this.data, {super.key, this.style, this.textAlign});

  final String data;
  final TextStyle? style;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return SelectableText(data, style: style, textAlign: textAlign);
    } else {
      return Text(data, style: style, textAlign: textAlign);
    }
  }
}
