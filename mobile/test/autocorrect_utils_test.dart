import 'package:app/widgets/keyboard/autocorrect_engine.dart';
import 'package:app/widgets/keyboard/autocorrect_utils.dart';
import 'package:app/widgets/keyboard/simulator_text_input_proxy.dart';
import 'package:flutter_test/flutter_test.dart';

DictionaryAutoCorrectEngine _dictEngine(List<String> words) {
  final engine = DictionaryAutoCorrectEngine(assetPath: '');
  engine.loadFromString(words.join('\n'));
  return engine;
}

void main() {
  group('applyAutoCorrect', () {
    test('corrects punctation errors', () {
      final engine = _dictEngine(['that\'s', 'that']);
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('thats');
      applyAutoCorrect(engine, proxy);
      expect(proxy.text, equals('that\'s'));
    });

    test('corrects misspelled word before cursor', () {
      final engine = _dictEngine(['thanks', 'the']);
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('thabks');

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals('thanks'));
      expect(proxy.cursorOffset, equals(6));
    });

    test('does not modify correct words', () {
      final engine = _dictEngine(['hello', 'world']);
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('hello');

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals('hello'));
    });

    test('only corrects the last word', () {
      final engine = _dictEngine(['hello', 'world']);
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('hello wrold');

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals('hello world'));
    });

    test('preserves text after cursor', () {
      final engine = _dictEngine(['hello', 'world']);
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('helo');
      proxy.insertText(' world');
      // Move cursor back to end of "helo"
      proxy.moveCursor(-6);

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals('hello world'));
      expect(proxy.cursorOffset, equals(5));
    });

    test('does nothing when no word before cursor', () {
      final engine = _dictEngine(['hello']);
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('   ');

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals('   '));
    });

    test('does nothing when engine not loaded', () {
      final engine = DictionaryAutoCorrectEngine(assetPath: '');
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('thabks');

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals('thabks'));
    });

    test('handles multiple words with only last corrected', () {
      final engine = _dictEngine(['the', 'quick', 'brown', 'fox']);
      final proxy = SimulatorTextInputProxy();
      proxy.insertText('the quick bown');

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals('the quick brown'));
    });

    test('does nothing on empty proxy', () {
      final engine = _dictEngine(['hello']);
      final proxy = SimulatorTextInputProxy();

      applyAutoCorrect(engine, proxy);

      expect(proxy.text, equals(''));
    });
  });
}
