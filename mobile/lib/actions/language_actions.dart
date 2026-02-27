import 'package:app/api/counter_api.dart';
import 'package:app/api/language_api.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/user_utils.dart';

final _logger = createNamedLogger('language_actions');

Future<void> loadDictationLanguages() async {
  try {
    var languages = await GetDictationLanguagesApi().call(null);
    String? active = await GetActiveDictationLanguageApi().call(null);

    if (languages.isEmpty) {
      final state = getAppState();
      final preferred = state.user?.preferredLanguage;
      final seed = preferred ?? getDetectedSystemLocale();
      languages = [seed];
      active = seed;
      await SetDictationLanguagesApi().call(languages);
      await SetActiveDictationLanguageApi().call(active);
    }

    if (active == null || !languages.contains(active)) {
      active = languages.first;
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
  if (languages.isEmpty) return;

  try {
    await SetDictationLanguagesApi().call(languages);

    final state = getAppState();
    var active = getMyActiveDictationLanguage(state);
    if (!languages.contains(active)) {
      active = languages.first;
      await SetActiveDictationLanguageApi().call(active);
    }

    produceAppState((draft) {
      draft.dictationLanguages = languages;
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
