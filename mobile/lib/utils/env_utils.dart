import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> loadEnvFile() => dotenv.load(isOptional: true);

String? get revenueCatAppleApiKey => dotenv.maybeGet('REVENUE_CAT_APPLE_API_KEY');
String get mixpanelToken => dotenv.env['MIXPANEL_TOKEN'] ?? '';
