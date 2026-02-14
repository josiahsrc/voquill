import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DevFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DevFirebaseOptions have not been configured for web - '
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
          'DevFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBRM0jt733_QsHwMC2E_uI4BUEJOlDPqsk',
    appId: '1:778214168359:android:44302d780bb11229d77b02',
    messagingSenderId: '778214168359',
    projectId: 'voquill-dev',
    storageBucket: 'voquill-dev.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCTC7reOttaVjmJIZjt_vYuaaW06KYpWws',
    appId: '1:778214168359:ios:d4a46b4feabd19dfd77b02',
    messagingSenderId: '778214168359',
    projectId: 'voquill-dev',
    storageBucket: 'voquill-dev.firebasestorage.app',
    iosClientId:
        '778214168359-062ds2e4o27utk6q7htloo6re9857lfb.apps.googleusercontent.com',
    iosBundleId: 'com.voquill.mobile.dev',
  );
}
