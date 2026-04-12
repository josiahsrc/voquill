import 'package:app/actions/revenue_cat_actions.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const purchasesChannel = MethodChannel('purchases_flutter');
  final purchasesCalls = <MethodCall>[];

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(purchasesChannel, (call) async {
          purchasesCalls.add(call);
          return null;
        });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(purchasesChannel, null);
    purchasesCalls.clear();
    dotenv.clean();
  });

  test('buildRevenueCatConfiguration returns null when apple key is missing', () {
    dotenv.loadFromString(envString: '', isOptional: true);

    expect(buildRevenueCatConfiguration(), isNull);
  });

  test(
    'buildRevenueCatConfiguration returns null when apple key is whitespace only',
    () {
      dotenv.loadFromString(
        envString: 'REVENUE_CAT_APPLE_API_KEY=   ',
        isOptional: true,
      );

      expect(buildRevenueCatConfiguration(), isNull);
    },
  );

  test('loginRevenueCat does not call plugin when apple key is missing',
      () async {
    dotenv.loadFromString(envString: '', isOptional: true);

    await loginRevenueCat('user-123');

    expect(purchasesCalls, isEmpty);
  });

  test('logoutRevenueCat does not call plugin when apple key is missing',
      () async {
    dotenv.loadFromString(envString: '', isOptional: true);

    await logoutRevenueCat();

    expect(purchasesCalls, isEmpty);
  });
}
