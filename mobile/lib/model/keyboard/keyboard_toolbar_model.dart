import 'package:app/model/keyboard/keyboard_key_model.dart';
import 'package:equatable/equatable.dart';

class KeyboardToolbarModel with EquatableMixin {
  final KeyboardKeyModel startStop;
  final KeyboardKeyModel language;
  final KeyboardKeyModel mode;
  final KeyboardKeyModel overflow;

  const KeyboardToolbarModel({
    required this.startStop,
    required this.language,
    required this.mode,
    required this.overflow,
  });

  factory KeyboardToolbarModel.standard() {
    return const KeyboardToolbarModel(
      startStop: KeyboardKeyModel.action(
        id: 'toolbar-start-stop',
        role: KeyboardKeyRole.startStop,
        label: 'Start/Stop',
      ),
      language: KeyboardKeyModel.action(
        id: 'toolbar-language',
        role: KeyboardKeyRole.language,
        label: 'Language',
      ),
      mode: KeyboardKeyModel.action(
        id: 'toolbar-mode',
        role: KeyboardKeyRole.mode,
        label: 'Mode',
      ),
      overflow: KeyboardKeyModel.action(
        id: 'toolbar-overflow',
        role: KeyboardKeyRole.overflow,
        label: 'More',
      ),
    );
  }

  List<KeyboardKeyModel> get persistentActions => [startStop, language, mode];

  @override
  List<Object?> get props => [startStop, language, mode, overflow];
}
