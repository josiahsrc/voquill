import 'dart:io' show Platform;

import 'package:app/state/app_state.dart';

String getDetectedSystemLocale() {
  return Platform.localeName.split('.').first.replaceAll('_', '-');
}

String getMyPrimaryDictationLanguage(AppState state) {
  final user = state.user;
  if (user?.preferredLanguage != null) {
    return user!.preferredLanguage!;
  }
  return getDetectedSystemLocale();
}
