import 'package:app/widgets/keyboard/autocorrect_engine.dart';
import 'package:app/widgets/keyboard/text_input_proxy.dart';

final _wordPattern = RegExp(r"[a-zA-Z']+$");

void applyAutoCorrect(AutoCorrectEngine engine, TextInputProxy proxy) {
  if (!engine.isLoaded) return;

  final before = proxy.textBeforeCursor;
  final match = _wordPattern.firstMatch(before);
  if (match == null) return;

  final word = match.group(0)!;
  final correction = engine.correct(word);
  if (correction == null) return;

  for (var i = 0; i < word.length; i++) {
    proxy.deleteBackward();
  }
  proxy.insertText(correction);
}
