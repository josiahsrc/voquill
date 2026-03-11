import 'package:app/widgets/keyboard/keyboard_types.dart';
import 'package:app/widgets/keyboard/typing_strategy.dart';

class TypingEn extends TypingStrategy {
  @override
  String get initialMode => 'default';

  @override
  Map<String, List<List<KeySpec>>> get layouts => {
        'default': [
          KeySpec.characters('qwertyuiop'),
          KeySpec.characters('asdfghjkl'),
          [
            const KeySpec.shift(),
            ...KeySpec.characters('zxcvbnm'),
            const KeySpec.backspace(),
          ],
          [
            const KeySpec.modeSwitch(label: '123', targetMode: 'symbols'),
            const KeySpec.space(),
            const KeySpec.enter(),
          ],
        ],
        'shift': [
          KeySpec.characters('QWERTYUIOP'),
          KeySpec.characters('ASDFGHJKL'),
          [
            const KeySpec.shift(),
            ...KeySpec.characters('ZXCVBNM'),
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
