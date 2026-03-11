import 'package:app/widgets/keyboard/keyboard_types.dart';

abstract class TypingStrategy {
  String get initialMode;

  Map<String, List<List<KeySpec>>> get layouts;

  String onModeTransition(String currentMode, KeyType trigger);
}
