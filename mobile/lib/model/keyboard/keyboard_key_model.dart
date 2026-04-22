import 'package:equatable/equatable.dart';

enum KeyboardKeyRole {
  character,
  shift,
  delete,
  space,
  enter,
  mode,
  language,
  globe,
  overflow,
  startStop,
}

class KeyboardKeyModel with EquatableMixin {
  final String id;
  final KeyboardKeyRole role;
  final String label;
  final String? value;
  final int flex;

  const KeyboardKeyModel({
    required this.id,
    required this.role,
    required this.label,
    this.value,
    this.flex = 1,
  }) : assert(
         role != KeyboardKeyRole.character || value != null,
         'Character keys require a value.',
       );

  const KeyboardKeyModel.character({
    required String id,
    required String value,
    String? label,
  }) : this(
         id: id,
         role: KeyboardKeyRole.character,
         label: label ?? value,
         value: value,
       );

  const KeyboardKeyModel.action({
    required this.id,
    required this.role,
    required this.label,
    this.flex = 1,
  }) : assert(
         role != KeyboardKeyRole.character,
         'Use KeyboardKeyModel.character for character keys.',
       ),
       value = null;

  bool get isCharacter => role == KeyboardKeyRole.character;

  @override
  List<Object?> get props => [id, role, label, value, flex];
}
