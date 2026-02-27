import 'dart:io' show Platform;

import 'package:app/model/user_model.dart';
import 'package:app/state/app_state.dart';
import 'package:intl/intl.dart';

String getDetectedSystemLocale() {
  return Platform.localeName.split('.').first.replaceAll('_', '-');
}

String getMyActiveDictationLanguage(AppState state) {
  return state.activeDictationLanguage ?? getDetectedSystemLocale();
}

int getEffectiveStreak(User? user) {
  final streak = user?.streak;
  final recordedAt = user?.streakRecordedAt;
  if (streak == null || streak == 0 || recordedAt == null) return 0;

  final fmt = DateFormat('yyyy-MM-dd');
  final now = DateTime.now();
  final today = fmt.format(now);
  if (recordedAt == today) return streak;

  final yesterday = fmt.format(now.subtract(const Duration(days: 1)));
  if (recordedAt == yesterday) return streak;

  return 0;
}
