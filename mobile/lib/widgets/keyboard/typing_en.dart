import 'package:app/widgets/keyboard/autocorrect_engine.dart';
import 'package:app/widgets/keyboard/keyboard_types.dart';
import 'package:app/widgets/keyboard/text_input_proxy.dart';
import 'package:app/widgets/keyboard/typing_strategy.dart';

final _wordPattern = RegExp(r"[a-zA-Z']+$");

class TypingEn extends TypingStrategy {
  final _engine = DictionaryAutoCorrectEngine(assetPath: 'assets/words/en.txt');

  TypingEn() {
    _engine.load();
  }

  @override
  AutoCorrectEngine get autoCorrectEngine => _engine;

  @override
  String get initialMode => 'default';

  @override
  Map<String, List<KeyRow>> get layouts => {
    'default': [
      KeyRow([
        const KeySpec.character('q'),
        const KeySpec.character('w'),
        const KeySpec.character('e', subKeys: ['è', 'é', 'ê', 'ë', 'ē']),
        const KeySpec.character('r'),
        const KeySpec.character('t'),
        const KeySpec.character('y', subKeys: ['ý', 'ÿ']),
        const KeySpec.character('u', subKeys: ['û', 'ü', 'ù', 'ú', 'ū']),
        const KeySpec.character('i', subKeys: ['î', 'ï', 'í', 'ī', 'ì']),
        const KeySpec.character(
          'o',
          subKeys: ['ô', 'ö', 'ò', 'ó', 'œ', 'ø', 'ō'],
        ),
        const KeySpec.character('p'),
      ]),
      KeyRow([
        const KeySpec.character(
          'a',
          subKeys: ['à', 'á', 'â', 'ä', 'æ', 'ã', 'å', 'ā'],
        ),
        const KeySpec.character('s', subKeys: ['ß', 'ś', 'š']),
        const KeySpec.character('d'),
        const KeySpec.character('f'),
        const KeySpec.character('g'),
        const KeySpec.character('h'),
        const KeySpec.character('j'),
        const KeySpec.character('k'),
        const KeySpec.character('l', subKeys: ['ł']),
      ]),
      KeyRow([
        const KeySpec.shift(),
        const KeySpec.character('z', subKeys: ['ž', 'ź', 'ż']),
        const KeySpec.character('x'),
        const KeySpec.character('c', subKeys: ['ç', 'ć', 'č']),
        const KeySpec.character('v'),
        const KeySpec.character('b'),
        const KeySpec.character('n', subKeys: ['ñ', 'ń']),
        const KeySpec.character('m'),
        const KeySpec.backspace(),
      ]),
      KeyRow([
        const KeySpec.modeSwitch(label: '123', targetMode: 'symbols'),
        const KeySpec.space(weight: 4),
        const KeySpec.enter(),
      ]),
    ],
    'shift': [
      KeyRow([
        const KeySpec.character('Q'),
        const KeySpec.character('W'),
        const KeySpec.character('E', subKeys: ['È', 'É', 'Ê', 'Ë', 'Ē']),
        const KeySpec.character('R'),
        const KeySpec.character('T'),
        const KeySpec.character('Y', subKeys: ['Ý', 'Ÿ']),
        const KeySpec.character('U', subKeys: ['Û', 'Ü', 'Ù', 'Ú', 'Ū']),
        const KeySpec.character('I', subKeys: ['Î', 'Ï', 'Í', 'Ī', 'Ì']),
        const KeySpec.character(
          'O',
          subKeys: ['Ô', 'Ö', 'Ò', 'Ó', 'Œ', 'Ø', 'Ō'],
        ),
        const KeySpec.character('P'),
      ]),
      KeyRow([
        const KeySpec.character(
          'A',
          subKeys: ['À', 'Á', 'Â', 'Ä', 'Æ', 'Ã', 'Å', 'Ā'],
        ),
        const KeySpec.character('S', subKeys: ['ẞ', 'Ś', 'Š']),
        const KeySpec.character('D'),
        const KeySpec.character('F'),
        const KeySpec.character('G'),
        const KeySpec.character('H'),
        const KeySpec.character('J'),
        const KeySpec.character('K'),
        const KeySpec.character('L', subKeys: ['Ł']),
      ]),
      KeyRow([
        const KeySpec.shift(),
        const KeySpec.character('Z', subKeys: ['Ž', 'Ź', 'Ż']),
        const KeySpec.character('X'),
        const KeySpec.character('C', subKeys: ['Ç', 'Ć', 'Č']),
        const KeySpec.character('V'),
        const KeySpec.character('B'),
        const KeySpec.character('N', subKeys: ['Ñ', 'Ń']),
        const KeySpec.character('M'),
        const KeySpec.backspace(),
      ]),
      KeyRow([
        const KeySpec.modeSwitch(label: '123', targetMode: 'symbols'),
        const KeySpec.space(weight: 4),
        const KeySpec.enter(),
      ]),
    ],
    'symbols': [
      KeyRow(KeySpec.characters('1234567890')),
      KeyRow(KeySpec.characters('-/:;()\$&@"')),
      KeyRow([
        const KeySpec.modeSwitch(label: '#+=', targetMode: 'symbols2', width: 64),
        KeySpec.spacer(),
        ...KeySpec.characters('.,?!\''),
        KeySpec.spacer(),
        const KeySpec.backspace(width: 64),
      ]),
      KeyRow([
        const KeySpec.modeSwitch(label: 'ABC', targetMode: 'default'),
        const KeySpec.space(weight: 4),
        const KeySpec.enter(),
      ]),
    ],
    'symbols2': [
      KeyRow(KeySpec.characters('[]{}#%^*+=')),
      KeyRow(KeySpec.characters('_\\|~<>€£¥•')),
      KeyRow([
        const KeySpec.modeSwitch(label: '123', targetMode: 'symbols', width: 64),
        KeySpec.spacer(),
        ...KeySpec.characters('.,?!\''),
        KeySpec.spacer(),
        const KeySpec.backspace(width: 64),
      ]),
      KeyRow([
        const KeySpec.modeSwitch(label: 'ABC', targetMode: 'default'),
        const KeySpec.space(weight: 4),
        const KeySpec.enter(),
      ]),
    ],
  };

  @override
  String onModeTransition(String currentMode, KeyType trigger) {
    if (trigger == KeyType.shift) {
      return currentMode == 'shift' ? 'default' : 'shift';
    }
    return currentMode;
  }

  @override
  void onKeyTap(KeySpec spec, TextInputProxy proxy) {
    switch (spec.type) {
      case KeyType.character:
        if (spec.value != null) proxy.insertText(spec.value!);
      case KeyType.space:
        _autoCorrect(proxy);
        proxy.insertText(' ');
      case KeyType.enter:
        _autoCorrect(proxy);
        proxy.insertText('\n');
      case KeyType.backspace:
        proxy.deleteBackward();
      case KeyType.shift:
      case KeyType.modeSwitch:
      case KeyType.spacer:
        break;
    }
  }

  void _autoCorrect(TextInputProxy proxy) {
    if (!_engine.isLoaded) return;

    final before = proxy.textBeforeCursor;
    final match = _wordPattern.firstMatch(before);
    if (match == null) return;

    final word = match.group(0)!;
    final correction = _engine.correct(word);
    if (correction == null) return;

    for (var i = 0; i < word.length; i++) {
      proxy.deleteBackward();
    }
    proxy.insertText(correction);
  }
}
