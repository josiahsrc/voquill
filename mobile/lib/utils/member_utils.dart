import 'package:app/model/member_model.dart';
import 'package:app/state/app_state.dart';
import 'package:intl/intl.dart';

enum EffectivePlan { free, pro }

EffectivePlan getEffectivePlan(AppState state) {
  final member = state.member;
  if (member == null) return EffectivePlan.free;
  if (member.plan == .pro) return EffectivePlan.pro;
  return EffectivePlan.free;
}

const trialDurationDays = 7;
final _trialDurationMs = trialDurationDays * Duration.millisecondsPerDay;

bool getIsOnTrial(AppState state) {
  return state.member?.isOnTrial == true;
}

bool getIsPro(AppState state) {
  final member = state.member;
  if (member == null) return false;
  return member.plan != MemberPlan.free;
}

int? getTrialDaysRemaining(AppState state) {
  final member = state.member;
  if (member?.isOnTrial != true || member?.trialEndsAt == null) {
    return null;
  }

  final now = DateTime.now().millisecondsSinceEpoch;
  final endsAt = DateTime.parse(member!.trialEndsAt!).millisecondsSinceEpoch;
  final msRemaining = endsAt - now;
  final days = (msRemaining / Duration.millisecondsPerDay).ceil();
  return days < 0 ? 0 : days;
}

double? getTrialProgress(AppState state) {
  final member = state.member;
  if (member?.isOnTrial != true || member?.trialEndsAt == null) {
    return null;
  }

  final now = DateTime.now().millisecondsSinceEpoch;
  final endsAt = DateTime.parse(member!.trialEndsAt!).millisecondsSinceEpoch;
  final msRemaining = endsAt - now;
  final progress = msRemaining / _trialDurationMs;
  return progress.clamp(0.0, 1.0);
}

final _numberFormat = NumberFormat('#,###');

int? getFreeWordsRemaining(AppState state) {
  final config = state.config;
  final member = state.member;
  if (config == null || member == null) return null;
  final remaining = config.freeWordsPerDay - member.wordsToday;
  return remaining < 0 ? 0 : remaining;
}

double? getFreeWordsProgress(AppState state) {
  final config = state.config;
  final member = state.member;
  if (config == null || member == null || config.freeWordsPerDay == 0) {
    return null;
  }
  final used = member.wordsToday / config.freeWordsPerDay;
  return used.clamp(0.0, 1.0);
}

String formatWordCount(int count) => _numberFormat.format(count);
