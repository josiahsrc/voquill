import 'dart:io' show Platform;

import 'package:app/state/app_state.dart';

String getDetectedSystemLocale() {
  return Platform.localeName.split('.').first.replaceAll('_', '-');
}

String getMyActiveDictationLanguage(AppState state) {
  return state.activeDictationLanguage ?? getDetectedSystemLocale();
}
