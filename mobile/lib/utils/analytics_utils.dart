import 'package:app/model/member_model.dart';
import 'package:app/state/app_state.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:app/utils/env_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';

final _logger = createNamedLogger('analytics');

Mixpanel? _instance;

Mixpanel? get mixpanel => _instance;

Future<void> initializeMixpanel() async {
  final token = mixpanelToken;
  if (token.isEmpty) {
    _logger.w('Mixpanel token not set, skipping initialization');
    return;
  }

  _instance = await Mixpanel.init(token, trackAutomaticEvents: false);
  _logger.i('Mixpanel initialized');
}

void trackPageView(String pageName) {
  _instance?.track('Page View', properties: {'page': pageName});
}

void trackOnboardingStep(String step) {
  _instance?.track('Mobile Onboarding Step', properties: {'step': step});
}

void trackSetupStep(String step) {
  _instance?.track('Mobile Setup Step', properties: {'step': step});
}

void trackPaymentComplete() {
  _instance?.track('Payment Complete');
}

void trackButtonClick(String name, [Map<String, dynamic>? props]) {
  _instance?.track('Button Click', properties: {'name': name, ...?props});
}

String? _prevUserId;

void syncMixpanelIdentity(AppState state) {
  final mp = _instance;
  if (mp == null) return;

  final uid = state.auth?.uid;

  if (_prevUserId != null && uid == null) {
    mp.reset();
    _prevUserId = null;
    return;
  }

  if (uid == null) return;

  final member = state.member;
  final user = state.user;
  final isPro = member?.plan == MemberPlan.pro;
  final isFree = member?.plan != MemberPlan.pro;
  final isTrial = member?.isOnTrial ?? false;
  final isPaying = !isTrial && isPro;
  final onboarded = user?.onboarded ?? false;
  final planStatus = member?.plan.name ?? 'free';

  if (uid != _prevUserId) {
    mp.identify(uid);

    mp.getPeople().setOnce('\$created', DateTime.now().toIso8601String());
    mp.getPeople().setOnce('initialPlatform', 'mobile-ios');
    mp.getPeople().setOnce('initialCohort', user?.cohort ?? '');

    mp.registerSuperPropertiesOnce({
      'initialPlatform': 'mobile-ios',
      'initialCohort': user?.cohort ?? '',
    });
  }

  mp.getPeople().set('\$email', state.auth?.email ?? '');
  mp.getPeople().set('\$name', user?.name ?? '');
  mp.getPeople().set('planStatus', planStatus);
  mp.getPeople().set('isPro', isPro);
  mp.getPeople().set('isFree', isFree);
  mp.getPeople().set('isTrial', isTrial);
  mp.getPeople().set('isPaying', isPaying);
  mp.getPeople().set('onboarded', onboarded);
  mp.getPeople().set('onboardedAt', user?.onboardedAt ?? '');
  mp.getPeople().set('company', user?.company ?? '');
  mp.getPeople().set('title', user?.title ?? '');

  mp.registerSuperProperties({
    'userId': uid,
    'planStatus': planStatus,
    'isPro': isPro,
    'isFree': isFree,
    'platform': 'mobile-ios',
    'onboarded': onboarded,
  });

  _prevUserId = uid;

  syncMixpanelUser(uid: uid);
}
