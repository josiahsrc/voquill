import 'package:app/actions/app_actions.dart';
import 'package:app/api/user_api.dart';
import 'package:app/model/firebase_model.dart';
import 'package:app/model/user_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/log_utils.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _logger = createNamedLogger('onboarding_actions');

const _kPageTarget = 'onboarding_page_target1';
const _kPageHistory = 'onboarding_page_history1';
const _kName = 'onboarding_name';
const _kTitle = 'onboarding_title';
const _kCompany = 'onboarding_company';

void setOnboardingName(String value) {
  produceAppState((draft) {
    draft.onboarding.name = value;
  });
  _persistOnboardingFields();
}

void setOnboardingTitle(String value) {
  produceAppState((draft) {
    draft.onboarding.title = value;
  });
  _persistOnboardingFields();
}

void setOnboardingCompany(String value) {
  produceAppState((draft) {
    draft.onboarding.company = value;
  });
  _persistOnboardingFields();
}

Future<void> _persistOnboardingFields() async {
  final state = getAppState().onboarding;
  final prefs = await SharedPreferences.getInstance();
  await Future.wait([
    prefs.setString(_kName, state.name),
    prefs.setString(_kTitle, state.title),
    prefs.setString(_kCompany, state.company),
  ]);
}

Future<void> persistOnboardingNavigation({
  required String target,
  required List<String> history,
}) async {
  final prefs = await SharedPreferences.getInstance();
  await Future.wait([
    prefs.setString(_kPageTarget, target),
    prefs.setStringList(_kPageHistory, history),
  ]);
}

class OnboardingProgress {
  final String target;
  final List<String> history;

  const OnboardingProgress({required this.target, required this.history});
}

Future<OnboardingProgress?> restoreOnboardingProgress() async {
  final prefs = await SharedPreferences.getInstance();
  final pageTarget = prefs.getString(_kPageTarget);
  final pageHistory = prefs.getStringList(_kPageHistory) ?? [];
  final name = prefs.getString(_kName) ?? '';
  final title = prefs.getString(_kTitle) ?? '';
  final company = prefs.getString(_kCompany) ?? '';

  if (name.isNotEmpty || title.isNotEmpty || company.isNotEmpty) {
    produceAppState((draft) {
      draft.onboarding.name = name;
      draft.onboarding.title = title;
      draft.onboarding.company = company;
    });
  }

  if (pageTarget == null) return null;
  return OnboardingProgress(target: pageTarget, history: pageHistory);
}

Future<void> clearOnboardingProgress() async {
  final prefs = await SharedPreferences.getInstance();
  await Future.wait([
    prefs.remove(_kPageTarget),
    prefs.remove(_kPageHistory),
    prefs.remove(_kName),
    prefs.remove(_kTitle),
    prefs.remove(_kCompany),
  ]);
}

Future<void> finishOnboarding() async {
  final state = getAppState();

  final auth = state.auth;
  if (auth == null) {
    return;
  }

  produceAppState((draft) {
    draft.onboarding.submitting = true;
  });

  try {
    await tryInitializeMember();

    final now = DateTime.now().toUtc().toIso8601String();
    final name = state.onboarding.name.isEmpty ? 'User' : state.onboarding.name;

    await SetMyUserApi().call(
      SetMyUserInput(
        value: User(
          id: auth.uid,
          createdAt: now,
          updatedAt: now,
          name: name,
          title: state.onboarding.title.isNotEmpty
              ? state.onboarding.title
              : null,
          company: state.onboarding.company.isNotEmpty
              ? state.onboarding.company
              : null,
          onboarded: true,
          onboardedAt: now,
          hasFinishedTutorial: true,
          playInteractionChime: true,
          wordsThisMonth: 0,
          wordsTotal: 0,
          hasMigratedPreferredMicrophone: false,
          shouldShowUpgradeDialog: false,
        ),
      ),
    );

    final output = await GetMyUserApi().call(null);
    produceAppState((draft) {
      draft.user = output.user;
      draft.onboarding.submitting = false;
    });

    await clearOnboardingProgress();
  } catch (e) {
    _logger.e('Failed to finish onboarding', e);
    produceAppState((draft) {
      draft.onboarding.submitting = false;
    });
    rethrow;
  }
}
