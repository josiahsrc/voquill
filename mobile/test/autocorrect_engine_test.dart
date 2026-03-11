import 'package:app/widgets/keyboard/autocorrect_engine.dart';
import 'package:flutter_test/flutter_test.dart';

DictionaryAutoCorrectEngine _createEngine(List<String> words) {
  final engine = DictionaryAutoCorrectEngine(assetPath: '');
  engine.loadFromString(words.join('\n'));
  return engine;
}

void main() {
  group('DictionaryAutoCorrectEngine', () {
    group('correct words', () {
      test('returns null for words in dictionary', () {
        final engine = _createEngine(['hello', 'world', 'the']);
        expect(engine.correct('hello'), isNull);
        expect(engine.correct('world'), isNull);
        expect(engine.correct('the'), isNull);
      });

      test('returns null for empty input', () {
        final engine = _createEngine(['hello']);
        expect(engine.correct(''), isNull);
      });

      test('is case-insensitive for dictionary lookup', () {
        final engine = _createEngine(['hello', 'world']);
        expect(engine.correct('Hello'), isNull);
        expect(engine.correct('HELLO'), isNull);
      });
    });

    group('edit distance corrections', () {
      test('corrects single character substitution', () {
        final engine = _createEngine(['thanks', 'the', 'that']);
        expect(engine.correct('thabks'), equals('thanks'));
      });

      test('corrects single character insertion', () {
        final engine = _createEngine(['the', 'hello']);
        expect(engine.correct('thhe'), equals('the'));
      });

      test('corrects single character deletion', () {
        final engine = _createEngine(['hello', 'world']);
        expect(engine.correct('helo'), equals('hello'));
      });

      test('corrects transposed characters', () {
        final engine = _createEngine(['from', 'the']);
        expect(engine.correct('form'), equals('from'));
      });

      test('returns null when edit distance exceeds max for word length', () {
        final engine = _createEngine(['hello']);
        expect(engine.correct('xxxxx'), isNull);
      });

      test('max distance 1 for short words (<= 3 chars)', () {
        final engine = _createEngine(['cat', 'dog']);
        // 'cxx' is distance 2 from 'cat' — too far for a 3-char word
        expect(engine.correct('cxx'), isNull);
        // 'cot' is distance 1 from 'cat' — allowed
        expect(engine.correct('cot'), equals('cat'));
      });

      test('max distance 2 for medium words (4-7 chars)', () {
        final engine = _createEngine(['hello']);
        // 'hxllo' is distance 1 — allowed
        expect(engine.correct('hxllo'), equals('hello'));
        // 'hxllo' is distance 1 — allowed
        expect(engine.correct('hexlo'), equals('hello'));
      });

      test('max distance 3 for long words (8+ chars)', () {
        final engine = _createEngine(['beautiful', 'something']);
        // 'beutaful' has 3 errors — allowed for 8+ char words
        expect(engine.correct('beutiful'), equals('beautiful'));
      });

      test('prefers edit distance 1 over distance 2', () {
        final engine = _createEngine(['cat', 'car', 'cup']);
        // 'cas' is distance 1 from 'cat' and 'car'
        final result = engine.correct('cas');
        expect(result, anyOf(equals('cat'), equals('car')));
      });

      test('prefers higher frequency word at same edit distance', () {
        // 'the' is first (most frequent), 'she' is second
        final engine = _createEngine(['the', 'she', 'bee']);
        // 'tse' is distance 1 from both 'the' (index 0) and distance 2 from 'bee'
        // but 'the' has lower index so it wins
        expect(engine.correct('thx'), equals('the'));
      });
    });

    group('prefix completion', () {
      test('completes partial words (>= 3 chars)', () {
        final engine = _createEngine(['the', 'there', 'their', 'them']);
        expect(engine.correct('ther'), equals('there'));
      });

      test('does not complete words shorter than 3 chars', () {
        final engine = _createEngine(['the', 'there']);
        // 'th' is only 2 chars, no prefix completion
        // but it's edit distance 1 from 'the', so it corrects via edit distance
        expect(engine.correct('th'), equals('the'));
      });

      test('prefers more frequent prefix match', () {
        // 'there' appears before 'thermal' so it's higher frequency
        final engine = _createEngine(['the', 'there', 'thermal']);
        expect(engine.correct('ther'), equals('there'));
      });
    });

    group('capitalization', () {
      test('preserves capitalization of input', () {
        final engine = _createEngine(['thanks', 'the']);
        expect(engine.correct('Thabks'), equals('Thanks'));
      });

      test('does not capitalize when input is lowercase', () {
        final engine = _createEngine(['thanks']);
        expect(engine.correct('thabks'), equals('thanks'));
      });
    });

    group('loading', () {
      test('isLoaded is false before loading', () {
        final engine = DictionaryAutoCorrectEngine(assetPath: '');
        expect(engine.isLoaded, isFalse);
      });

      test('isLoaded is true after loading', () {
        final engine = _createEngine(['hello']);
        expect(engine.isLoaded, isTrue);
      });

      test('correct returns null when not loaded', () {
        final engine = DictionaryAutoCorrectEngine(assetPath: '');
        expect(engine.correct('hello'), isNull);
      });

      test('handles blank lines and whitespace in word list', () {
        final engine = DictionaryAutoCorrectEngine(assetPath: '');
        engine.loadFromString('  hello  \n\n  world  \n\n');
        expect(engine.correct('hello'), isNull); // in dictionary
        expect(engine.correct('world'), isNull); // in dictionary
        expect(engine.correct('helo'), equals('hello')); // corrects
      });

      test('deduplicates words', () {
        final engine = _createEngine(['hello', 'hello', 'world']);
        expect(engine.correct('hello'), isNull);
      });
    });

    group('edge cases', () {
      test('handles single character words', () {
        final engine = _createEngine(['a', 'i']);
        expect(engine.correct('a'), isNull);
        expect(engine.correct('i'), isNull);
      });

      test('handles very short misspellings', () {
        final engine = _createEngine(['a', 'i', 'be', 'the']);
        // 'b' is distance 1 from 'a' and 'i', picks most frequent
        expect(engine.correct('b'), equals('a'));
      });

      test('edit distance 1 beats prefix completion', () {
        // 'helo' is distance 1 from 'hello' (score: 1000 + 0 = 1000)
        // 'helop' doesn't exist, so no prefix conflict
        final engine = _createEngine(['hello', 'help']);
        expect(engine.correct('helo'), equals('hello'));
      });

      test('prefix completion can beat edit distance 2', () {
        // 'thabks' is a prefix of 'thabksomething' (score: 1 + 11*100 = 1101)
        // 'thabks' is distance 2 from 'thanks' (score: 2000 + 0 = 2000)
        // Prefix wins because lower score
        final engine = _createEngine(['thanks', 'thabksomething']);
        expect(engine.correct('thabks'), equals('thabksomething'));
      });
    });
  });
}
