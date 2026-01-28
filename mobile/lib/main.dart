import 'dart:async';

import 'package:app/root.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/version.dart';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import 'flavor.dart';

Future<void> main() async {
  Flavor.load();
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
