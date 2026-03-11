enum KeyType {
  character,
  backspace,
  shift,
  modeSwitch,
  space,
  enter,
}

class KeySpec {
  final String label;
  final String? value;
  final KeyType type;
  final List<String> subKeys;
  final String? targetMode;

  const KeySpec({
    required this.label,
    this.value,
    this.type = KeyType.character,
    this.subKeys = const [],
    this.targetMode,
  });

  const KeySpec.character(String char, {this.subKeys = const []})
      : label = char,
        value = char,
        type = KeyType.character,
        targetMode = null;

  const KeySpec.backspace()
      : label = '⌫',
        value = null,
        type = KeyType.backspace,
        subKeys = const [],
        targetMode = null;

  const KeySpec.shift()
      : label = '⇧',
        value = null,
        type = KeyType.shift,
        subKeys = const [],
        targetMode = null;

  const KeySpec.space()
      : label = ' ',
        value = ' ',
        type = KeyType.space,
        subKeys = const [],
        targetMode = null;

  const KeySpec.enter()
      : label = '↵',
        value = '\n',
        type = KeyType.enter,
        subKeys = const [],
        targetMode = null;

  const KeySpec.modeSwitch({required this.label, required this.targetMode})
      : value = null,
        type = KeyType.modeSwitch,
        subKeys = const [];

  static List<KeySpec> characters(String chars) =>
      chars.split('').map((c) => KeySpec.character(c)).toList();
}
