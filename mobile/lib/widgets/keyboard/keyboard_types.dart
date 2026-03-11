import 'package:flutter/material.dart';

enum KeyType { character, backspace, shift, modeSwitch, space, enter, spacer }

class KeySpec {
  final String label;
  final String? value;
  final KeyType type;
  final List<String> subKeys;
  final String? targetMode;
  final IconData? icon;
  final int weight;
  final double? maxWidth;

  const KeySpec({
    required this.label,
    this.value,
    this.type = KeyType.character,
    this.subKeys = const [],
    this.targetMode,
    this.icon,
    this.weight = 1,
    this.maxWidth,
  });

  const KeySpec.character(
    String char, {
    this.subKeys = const [],
    this.weight = 1,
    this.maxWidth = 40,
  }) : label = char,
       value = char,
       type = KeyType.character,
       targetMode = null,
       icon = null;

  const KeySpec.backspace({this.weight = 1, this.maxWidth})
    : label = '⌫',
      value = null,
      type = KeyType.backspace,
      subKeys = const [],
      targetMode = null,
      icon = Icons.backspace_outlined;

  const KeySpec.shift({this.weight = 1, this.maxWidth})
    : label = '⇧',
      value = null,
      type = KeyType.shift,
      subKeys = const [],
      targetMode = null,
      icon = Icons.arrow_upward;

  const KeySpec.space({this.weight = 1, this.maxWidth})
    : label = 'space',
      value = ' ',
      type = KeyType.space,
      subKeys = const [],
      targetMode = null,
      icon = null;

  const KeySpec.enter({this.weight = 1, this.maxWidth})
    : label = '↵',
      value = '\n',
      type = KeyType.enter,
      subKeys = const [],
      targetMode = null,
      icon = Icons.keyboard_return;

  const KeySpec.spacer({this.weight = 1, this.maxWidth})
    : label = '',
      value = null,
      type = KeyType.spacer,
      subKeys = const [],
      targetMode = null,
      icon = null;

  const KeySpec.modeSwitch({
    required this.label,
    required this.targetMode,
    this.weight = 1,
    this.maxWidth,
  }) : value = null,
       type = KeyType.modeSwitch,
       subKeys = const [],
       icon = null;

  KeySpec copyWithValue(String newValue) => KeySpec(
    label: newValue,
    value: newValue,
    type: type,
    subKeys: subKeys,
    targetMode: targetMode,
    icon: icon,
    weight: weight,
    maxWidth: maxWidth,
  );

  static List<KeySpec> characters(String chars) =>
      chars.split('').map((c) => KeySpec.character(c)).toList();
}

class KeyRow {
  final List<KeySpec> keys;
  final MainAxisAlignment alignment;

  const KeyRow(this.keys, {this.alignment = MainAxisAlignment.center});
}
