import 'package:equatable/equatable.dart';

enum KeyboardKeyRole {
  character,
  shift,
  delete,
  space,
  enter,
  mode,
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
  });

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
    required String id,
    required KeyboardKeyRole role,
    required String label,
    int flex = 1,
  }) : this(id: id, role: role, label: label, flex: flex);

  bool get isCharacter => role == KeyboardKeyRole.character;

  @override
  List<Object?> get props => [id, role, label, value, flex];
}
