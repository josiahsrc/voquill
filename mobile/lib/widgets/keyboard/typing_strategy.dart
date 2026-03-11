import 'package:app/widgets/keyboard/autocorrect_engine.dart';
import 'package:app/widgets/keyboard/keyboard_types.dart';
import 'package:app/widgets/keyboard/text_input_proxy.dart';

abstract class TypingStrategy {
  String get initialMode;

  Map<String, List<KeyRow>> get layouts;

  AutoCorrectEngine? get autoCorrectEngine => null;

  String onModeTransition(String currentMode, KeyType trigger);

  void onKeyTap(KeySpec spec, TextInputProxy proxy);
}
