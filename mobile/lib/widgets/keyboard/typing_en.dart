import 'package:app/widgets/keyboard/keyboard_types.dart';
import 'package:app/widgets/keyboard/typing_strategy.dart';

class TypingEn extends TypingStrategy {
  @override
  String get initialMode => 'default';

  @override
  Map<String, List<List<KeySpec>>> get layouts => {
        'default': [
          [
            const KeySpec.character('q'),
            const KeySpec.character('w'),
            const KeySpec.character('e', subKeys: ['è', 'é', 'ê', 'ë', 'ē']),
            const KeySpec.character('r'),
            const KeySpec.character('t'),
            const KeySpec.character('y', subKeys: ['ý', 'ÿ']),
            const KeySpec.character('u', subKeys: ['û', 'ü', 'ù', 'ú', 'ū']),
            const KeySpec.character('i', subKeys: ['î', 'ï', 'í', 'ī', 'ì']),
            const KeySpec.character('o', subKeys: ['ô', 'ö', 'ò', 'ó', 'œ', 'ø', 'ō']),
            const KeySpec.character('p'),
          ],
          [
            const KeySpec.character('a', subKeys: ['à', 'á', 'â', 'ä', 'æ', 'ã', 'å', 'ā']),
            const KeySpec.character('s', subKeys: ['ß', 'ś', 'š']),
            const KeySpec.character('d'),
            const KeySpec.character('f'),
            const KeySpec.character('g'),
            const KeySpec.character('h'),
            const KeySpec.character('j'),
            const KeySpec.character('k'),
            const KeySpec.character('l', subKeys: ['ł']),
          ],
          [
            const KeySpec.shift(),
            const KeySpec.character('z', subKeys: ['ž', 'ź', 'ż']),
            const KeySpec.character('x'),
            const KeySpec.character('c', subKeys: ['ç', 'ć', 'č']),
            const KeySpec.character('v'),
            const KeySpec.character('b'),
            const KeySpec.character('n', subKeys: ['ñ', 'ń']),
            const KeySpec.character('m'),
            const KeySpec.backspace(),
          ],
          [
            const KeySpec.modeSwitch(label: '123', targetMode: 'symbols'),
            const KeySpec.space(),
            const KeySpec.enter(),
          ],
        ],
        'shift': [
          [
            const KeySpec.character('Q'),
            const KeySpec.character('W'),
            const KeySpec.character('E', subKeys: ['È', 'É', 'Ê', 'Ë', 'Ē']),
            const KeySpec.character('R'),
            const KeySpec.character('T'),
            const KeySpec.character('Y', subKeys: ['Ý', 'Ÿ']),
            const KeySpec.character('U', subKeys: ['Û', 'Ü', 'Ù', 'Ú', 'Ū']),
            const KeySpec.character('I', subKeys: ['Î', 'Ï', 'Í', 'Ī', 'Ì']),
            const KeySpec.character('O', subKeys: ['Ô', 'Ö', 'Ò', 'Ó', 'Œ', 'Ø', 'Ō']),
            const KeySpec.character('P'),
          ],
          [
            const KeySpec.character('A', subKeys: ['À', 'Á', 'Â', 'Ä', 'Æ', 'Ã', 'Å', 'Ā']),
            const KeySpec.character('S', subKeys: ['ẞ', 'Ś', 'Š']),
            const KeySpec.character('D'),
            const KeySpec.character('F'),
            const KeySpec.character('G'),
            const KeySpec.character('H'),
            const KeySpec.character('J'),
            const KeySpec.character('K'),
            const KeySpec.character('L', subKeys: ['Ł']),
          ],
          [
            const KeySpec.shift(),
            const KeySpec.character('Z', subKeys: ['Ž', 'Ź', 'Ż']),
            const KeySpec.character('X'),
            const KeySpec.character('C', subKeys: ['Ç', 'Ć', 'Č']),
            const KeySpec.character('V'),
            const KeySpec.character('B'),
            const KeySpec.character('N', subKeys: ['Ñ', 'Ń']),
            const KeySpec.character('M'),
            const KeySpec.backspace(),
          ],
          [
            const KeySpec.modeSwitch(label: '123', targetMode: 'symbols'),
            const KeySpec.space(),
            const KeySpec.enter(),
          ],
        ],
        'symbols': [
          KeySpec.characters('1234567890'),
          KeySpec.characters('-/:;()\$&@"'),
          [
            const KeySpec.modeSwitch(label: '#+=', targetMode: 'symbols2'),
            ...KeySpec.characters('.,?!\''),
            const KeySpec.backspace(),
          ],
          [
            const KeySpec.modeSwitch(label: 'ABC', targetMode: 'default'),
            const KeySpec.space(),
            const KeySpec.enter(),
          ],
        ],
        'symbols2': [
          KeySpec.characters('[]{}#%^*+='),
          KeySpec.characters('_\\|~<>€£¥•'),
          [
            const KeySpec.modeSwitch(label: '123', targetMode: 'symbols'),
            ...KeySpec.characters('.,?!\''),
            const KeySpec.backspace(),
          ],
          [
            const KeySpec.modeSwitch(label: 'ABC', targetMode: 'default'),
            const KeySpec.space(),
            const KeySpec.enter(),
          ],
        ],
      };

  @override
  String onModeTransition(String currentMode, KeyType trigger) {
    if (trigger == KeyType.shift) {
      return currentMode == 'shift' ? 'default' : 'shift';
    }
    return currentMode;
  }
}
