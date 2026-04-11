import 'package:app/utils/env_utils.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(() {
    dotenv.clean();
  });

  test('empty optional dotenv keeps runtime env access safe', () {
    dotenv.loadFromString(envString: '', isOptional: true);

    expect(revenueCatAppleApiKey, isNull);
    expect(mixpanelToken, '');
  });
}
