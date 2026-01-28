import 'package:collection/collection.dart';
import 'package:flutter/services.dart';

enum Flavor {
  prod,
  emulator;

  static late Flavor current;

  bool get isProd => this == Flavor.prod;
  bool get isEmulator => this == Flavor.emulator;

  String get title {
    switch (this) {
      case Flavor.prod:
        return 'Voquill';
      case Flavor.emulator:
        return 'Voquill Emulator';
    }
  }

  Color? get color {
    switch (this) {
      case Flavor.emulator:
        return const Color.fromARGB(255, 177, 90, 183);
      default:
        return null;
    }
  }

  String get shortName {
    switch (this) {
      case Flavor.prod:
        return 'prod';
      case Flavor.emulator:
        return 'emu';
    }
  }

  String get termsUrl => 'https://voquill.com/terms';
  String get privacyUrl => 'https://voquill.com/privacy';

  static void load() {
    final flavorOpt = Flavor.values.firstWhereOrNull(
      (element) => element.name == appFlavor,
    );

    const flavorEnvRaw = String.fromEnvironment('FLAVOR');
    final flavorEnv = Flavor.values.firstWhereOrNull(
      (element) => element.name == flavorEnvRaw,
    );

    current = flavorOpt ?? flavorEnv ?? Flavor.prod;
  }
}
