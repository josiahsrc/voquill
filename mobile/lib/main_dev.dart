import 'boot.dart';
import 'config/firebase_options_dev.dart';
import 'flavor.dart';

void main() => boot(Flavor.dev, DevFirebaseOptions.currentPlatform);
