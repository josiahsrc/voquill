import 'dart:async';

import 'package:app/actions/revenue_cat_actions.dart';
import 'package:app/root.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/version.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:logger/logger.dart';

import 'flavor.dart';

Future<void> boot(Flavor flavor, FirebaseOptions firebaseOptions) async {
  Flavor.set(flavor);
  Version.load();

  if (Flavor.current.isProd) {
    Logger.level = Level.info;
  } else {
    Logger.level = Level.all;
  }

  final logger = createNamedLogger('main');

  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await dotenv.load();

      // TODO: Figure out why emualtors throw 'duplicate-app' error and remove this workaround
      try {
        await Firebase.initializeApp(options: firebaseOptions);
      } on FirebaseException catch (e) {
        if (e.code != 'duplicate-app') rethrow;
      }

      if (Flavor.current.isEmulators) {
        final host = Flavor.current.emulatorHost;
        await FirebaseAuth.instance.useAuthEmulator(host, 9099);
        FirebaseFunctions.instance.useFunctionsEmulator(host, 5001);
        logger.i('Using Firebase emulators at $host');
      }

      await initializeRevenueCat();

      FlutterError.onError = (FlutterErrorDetails details) {
        logger.e('FlutterError', details.exception, details.stack);
      };

      runApp(const Root());
    },
    (error, stack) {
      logger.e('Uncaught zone error', error, stack);
    },
  );
}
