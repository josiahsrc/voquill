import 'package:app/actions/app_actions.dart';
import 'package:app/api/user_api.dart';
import 'package:app/model/firebase_model.dart';
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
  if (state.auth == null) return;

  produceAppState((draft) {
    draft.onboarding.submitting = true;
  });

  try {
    await tryInitializeMember();

    final now = DateTime.now().toUtc().toIso8601String();
    final name = state.onboarding.name.isEmpty ? 'User' : state.onboarding.name;

    await SetMyUserApi().call(SetMyUserInput(
      value: {
        'name': name,
        if (state.onboarding.title.isNotEmpty) 'title': state.onboarding.title,
        if (state.onboarding.company.isNotEmpty)
          'company': state.onboarding.company,
        'onboarded': true,
        'onboardedAt': now,
        'hasFinishedTutorial': true,
        'playInteractionChime': true,
      },
    ));

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
