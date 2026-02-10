import 'boot.dart';
import 'config/firebase_options_prod.dart';
import 'flavor.dart';

void main() => boot(Flavor.prod, ProdFirebaseOptions.currentPlatform);
