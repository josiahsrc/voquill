abstract class TextInputProxy {
  String get textBeforeCursor;
  String get textAfterCursor;
  String? get selectedText;

  void insertText(String text);
  void deleteBackward();
  void moveCursor(int offset);
}
