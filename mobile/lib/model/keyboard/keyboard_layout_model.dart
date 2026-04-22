import 'package:app/model/keyboard/keyboard_key_model.dart';
import 'package:app/model/keyboard/keyboard_toolbar_model.dart';
import 'package:app/utils/keyboard_layout_utils.dart';
import 'package:equatable/equatable.dart';

export 'keyboard_key_model.dart';

class KeyboardBottomRowModel with EquatableMixin {
  final KeyboardKeyModel mode;
  final KeyboardKeyModel globe;
  final KeyboardKeyModel space;
  final KeyboardKeyModel delete;
  final KeyboardKeyModel enter;

  const KeyboardBottomRowModel({
    required this.mode,
    required this.globe,
    required this.space,
    required this.delete,
    required this.enter,
  });

  List<KeyboardKeyModel> get keys => [mode, globe, space, delete, enter];

  @override
  List<Object?> get props => [mode, globe, space, delete, enter];
}

class KeyboardLayoutModel with EquatableMixin {
  final String languageCode;
  final List<List<KeyboardKeyModel>> alphaRows;
  final List<List<KeyboardKeyModel>> numericRows;
  final List<List<KeyboardKeyModel>> symbolRows;
  final KeyboardKeyModel shift;
  final KeyboardBottomRowModel bottomRow;
  final KeyboardToolbarModel toolbar;

  const KeyboardLayoutModel({
    required this.languageCode,
    required this.alphaRows,
    required this.numericRows,
    required this.symbolRows,
    required this.shift,
    required this.bottomRow,
    required this.toolbar,
  });

  factory KeyboardLayoutModel.englishQwerty() {
    final alphaRows = [
      buildCharacterKeyRow('qwertyuiop'),
      buildCharacterKeyRow('asdfghjkl'),
      buildCharacterKeyRow('zxcvbnm'),
    ];
    final numericRows = [
      buildCharacterKeys(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']),
      buildCharacterKeys(['-', '/', ':', ';', '(', ')', '\$', '&', '@', '"']),
      buildCharacterKeys(['.', ',', '?', '!', "'"]),
    ];
    final symbolRows = [
      buildCharacterKeys(['[', ']', '{', '}', '#', '%', '^', '*', '+', '=']),
      buildCharacterKeys(['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•']),
      buildCharacterKeys(['.', ',', '?', '!', "'"]),
    ];

    return KeyboardLayoutModel(
      languageCode: 'en',
      alphaRows: alphaRows,
      numericRows: numericRows,
      symbolRows: symbolRows,
      shift: const KeyboardKeyModel.action(
        id: 'alpha-shift',
        role: KeyboardKeyRole.shift,
        label: 'shift',
      ),
      bottomRow: const KeyboardBottomRowModel(
        mode: KeyboardKeyModel.action(
          id: 'bottom-mode',
          role: KeyboardKeyRole.mode,
          label: '123',
        ),
        globe: KeyboardKeyModel.action(
          id: 'bottom-globe',
          role: KeyboardKeyRole.globe,
          label: '🌐',
        ),
        space: KeyboardKeyModel.action(
          id: 'bottom-space',
          role: KeyboardKeyRole.space,
          label: 'space',
          flex: 4,
        ),
        delete: KeyboardKeyModel.action(
          id: 'bottom-delete',
          role: KeyboardKeyRole.delete,
          label: '⌫',
        ),
        enter: KeyboardKeyModel.action(
          id: 'bottom-enter',
          role: KeyboardKeyRole.enter,
          label: 'return',
        ),
      ),
      toolbar: KeyboardToolbarModel.standard(),
    );
  }

  KeyboardLayoutModel copyWith({
    List<List<KeyboardKeyModel>>? alphaRows,
    List<List<KeyboardKeyModel>>? numericRows,
    List<List<KeyboardKeyModel>>? symbolRows,
    KeyboardKeyModel? shift,
  }) {
    return KeyboardLayoutModel(
      languageCode: languageCode,
      alphaRows: alphaRows ?? this.alphaRows,
      numericRows: numericRows ?? this.numericRows,
      symbolRows: symbolRows ?? this.symbolRows,
      shift: shift ?? this.shift,
      bottomRow: bottomRow,
      toolbar: toolbar,
    );
  }

  @override
  List<Object?> get props => [
    languageCode,
    alphaRows,
    numericRows,
    symbolRows,
    shift,
    bottomRow,
    toolbar,
  ];
}
