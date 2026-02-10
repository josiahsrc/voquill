import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class EmulatorFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'EmulatorFirebaseOptions have not been configured for web - '
        'you can reconfigure this by running the FlutterFire CLI again.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'EmulatorFirebaseOptions are not supported for this platform.',
        );
    }
  }

  // Uses prod credentials for now (emulator mobile apps not yet registered on voquill-dev).
  // Only projectId differs so Cloud Functions URLs resolve correctly against the emulator.
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCNZj1p4_dizcd_eO_yPtp6FEIW81mf_0I',
    appId: '1:777461284594:android:9e32e369256288995e5a6b',
    messagingSenderId: '777461284594',
    projectId: 'voquill-dev',
    databaseURL: 'https://voquill-prod-default-rtdb.firebaseio.com',
    storageBucket: 'voquill-prod.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCXQ22eWG1TEezraliFu0U4jE864LCtXTg',
    appId: '1:777461284594:ios:1ba63f1bf2d9e1465e5a6b',
    messagingSenderId: '777461284594',
    projectId: 'voquill-dev',
    databaseURL: 'https://voquill-prod-default-rtdb.firebaseio.com',
    storageBucket: 'voquill-prod.firebasestorage.app',
    iosClientId:
        '777461284594-dc0e2uabqh68opiheciabv5ivqq43ui0.apps.googleusercontent.com',
    iosBundleId: 'com.voquill.app',
  );
}
