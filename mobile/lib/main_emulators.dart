import 'boot.dart';
import 'config/firebase_options_emulators.dart';
import 'flavor.dart';

void main() =>
    boot(Flavor.emulators, EmulatorFirebaseOptions.currentPlatform);
