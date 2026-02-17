import 'package:app/actions/app_actions.dart';
import 'package:app/flavor.dart';
import 'package:app/utils/env_utils.dart';
import 'package:app/utils/log_utils.dart';
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

Future<void> presentPaywall() async {
  await RevenueCatUI.presentPaywallIfNeeded('Voquill Pro');
  await loadCurrentMember();
}

Future<void> presentCustomerCenter() async {
  await RevenueCatUI.presentCustomerCenter();
}

Future<void> restorePurchases() async {
  try {
    await Purchases.restorePurchases();
    await loadCurrentMember();
  } catch (e) {
    _logger.w('Restore purchases failed', e);
  }
}
