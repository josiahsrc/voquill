import 'package:app/actions/app_actions.dart';
import 'package:app/flavor.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/env_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/widgets/common/app_overlay.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

final _logger = createNamedLogger('revenue_cat');

Future<void> initializeRevenueCat() async {
  final config = PurchasesConfiguration(revenueCatAppleApiKey);
  if (!Flavor.current.isProd) {
    await Purchases.setLogLevel(LogLevel.debug);
  }
  await Purchases.configure(config);
  _logger.i('RevenueCat initialized');
}

Future<void> loginRevenueCat(String uid) async {
  try {
    await Purchases.logIn(uid);
    _logger.i('RevenueCat logged in user $uid');
  } catch (e) {
    _logger.w('RevenueCat login failed', e);
  }
}

Future<void> logoutRevenueCat() async {
  try {
    await Purchases.logOut();
    _logger.i('RevenueCat logged out');
  } catch (e) {
    _logger.w('RevenueCat logout failed', e);
  }
}

// RC takes time since it's a web hook
Future<void> refreshMemberUntilChange() async {
  await loadCurrentMember();
  final startingPlan = getAppState().member?.plan;

  for (var i = 0; i < 5; i++) {
    final delay = Duration(seconds: i * 2);
    await Future.delayed(delay);

    await loadCurrentMember();
    final currentPlan = getAppState().member?.plan;
    if (currentPlan != startingPlan) {
      _logger.i(
        'Member plan changed from $startingPlan to $currentPlan after ${delay.inSeconds} seconds',
      );
      return;
    }
  }
}

void presentPaywall() {
  showAppOverlay(AppOverlayType.paywall);
}

Future<void> presentCustomerCenter() async {
  await RevenueCatUI.presentCustomerCenter();
  await refreshMemberUntilChange();
}

Future<void> restorePurchases() async {
  try {
    await Purchases.restorePurchases();
    await refreshMemberUntilChange();
  } catch (e) {
    _logger.w('Restore purchases failed', e);
  }
}
