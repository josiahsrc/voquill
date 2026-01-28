class Version {
  final String name;
  final String build;

  static late Version current;

  String get full => '$name+$build';

  const Version._({required this.name, required this.build});

  static void load() {
    const versionRaw = String.fromEnvironment(
      'APP_VERSION',
      defaultValue: "dev",
    );

    const buildRaw = String.fromEnvironment(
      'APP_BUILD_NUMBER',
      defaultValue: "0",
    );

    current = Version._(name: versionRaw, build: buildRaw);
  }
}
