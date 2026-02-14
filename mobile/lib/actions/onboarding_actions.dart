import 'package:app/actions/app_actions.dart';
import 'package:app/api/user_api.dart';
import 'package:app/model/firebase_model.dart';
import 'package:app/model/user_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/log_utils.dart';

final _logger = createNamedLogger('onboarding_actions');

void setOnboardingName(String value) {
  produceAppState((draft) {
    draft.onboarding.name = value;
  });
}

void setOnboardingTitle(String value) {
  produceAppState((draft) {
    draft.onboarding.title = value;
  });
}

void setOnboardingCompany(String value) {
  produceAppState((draft) {
    draft.onboarding.company = value;
  });
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
  } catch (e) {
    _logger.e('Failed to finish onboarding', e);
    produceAppState((draft) {
      draft.onboarding.submitting = false;
    });
    rethrow;
  }
}
