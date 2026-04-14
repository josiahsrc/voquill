import 'package:app/api/counter_api.dart';
import 'package:app/api/language_api.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/language_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/user_utils.dart';

final _logger = createNamedLogger('language_actions');

List<String> _normalizeLanguageList(List<String> input) {
  final seen = <String>{};
  final out = <String>[];
  for (final raw in input) {
    final normalized = normalizeDictationLanguage(raw);
    if (normalized == null) continue;
    if (seen.add(normalized)) out.add(normalized);
  }
  return out;
}

Future<void> loadDictationLanguages() async {
  try {
    final storedLanguages = await GetDictationLanguagesApi().call(null);
    final storedActive = await GetActiveDictationLanguageApi().call(null);

    var languages = _normalizeLanguageList(storedLanguages);
    var active = normalizeDictationLanguage(storedActive);

    if (languages.isEmpty) {
      final state = getAppState();
      final seed =
          normalizeDictationLanguage(state.user?.preferredLanguage) ??
          normalizeDictationLanguage(getDetectedSystemLocale()) ??
          'en';
      languages = [seed];
      active = seed;
    }

    if (active == null || !languages.contains(active)) {
      active = languages.first;
    }

    final languagesChanged =
        storedLanguages.length != languages.length ||
        !List.generate(
          languages.length,
          (i) => storedLanguages[i] == languages[i],
        ).every((ok) => ok);
    if (languagesChanged) {
      await SetDictationLanguagesApi().call(languages);
    }
    if (storedActive != active) {
      await SetActiveDictationLanguageApi().call(active);
    }

    produceAppState((draft) {
      draft.dictationLanguages = languages;
      draft.activeDictationLanguage = active;
    });
  } catch (e) {
    _logger.w('Failed to load dictation languages', e);
  }
}

Future<void> setDictationLanguages(List<String> languages) async {
  final normalized = _normalizeLanguageList(languages);
  if (normalized.isEmpty) return;

  try {
    await SetDictationLanguagesApi().call(normalized);

    final state = getAppState();
    var active = getMyActiveDictationLanguage(state);
    if (!normalized.contains(active)) {
      active = normalized.first;
      await SetActiveDictationLanguageApi().call(active);
    }

    produceAppState((draft) {
      draft.dictationLanguages = normalized;
      draft.activeDictationLanguage = active;
    });

    await IncrementKeyboardCounterApi().call(null);
  } catch (e) {
    _logger.w('Failed to set dictation languages', e);
  }
}

Future<void> setActiveDictationLanguage(String language) async {
  try {
    await SetActiveDictationLanguageApi().call(language);

    produceAppState((draft) {
      draft.activeDictationLanguage = language;
    });

    await IncrementKeyboardCounterApi().call(null);
  } catch (e) {
    _logger.w('Failed to set active dictation language', e);
  }
}
