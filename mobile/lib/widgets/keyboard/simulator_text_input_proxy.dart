import 'package:app/widgets/keyboard/text_input_proxy.dart';
import 'package:flutter/material.dart';

class SimulatorTextInputProxy extends ChangeNotifier implements TextInputProxy {
  String _text = '';
  int _cursorOffset = 0;

  String get text => _text;
  int get cursorOffset => _cursorOffset;

  @override
  String get textBeforeCursor => _text.substring(0, _cursorOffset);

  @override
  String get textAfterCursor => _text.substring(_cursorOffset);

  @override
  String? get selectedText => null;

  @override
  void insertText(String text) {
    _text = _text.substring(0, _cursorOffset) +
        text +
        _text.substring(_cursorOffset);
    _cursorOffset += text.length;
    notifyListeners();
  }

  @override
  void deleteBackward() {
    if (_cursorOffset == 0) return;

    _text = _text.substring(0, _cursorOffset - 1) +
        _text.substring(_cursorOffset);
    _cursorOffset--;
    notifyListeners();
  }

  @override
  void moveCursor(int offset) {
    _cursorOffset = (_cursorOffset + offset).clamp(0, _text.length);
    notifyListeners();
  }
}
