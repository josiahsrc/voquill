import 'package:app/model/keyboard/keyboard_layout_model.dart';
import 'package:app/model/keyboard/keyboard_state_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('english alpha layout exposes stable semantic keys', () {
    final layout = KeyboardLayoutModel.englishQwerty();

    expect(layout.alphaRows.length, 3);
    expect(layout.shift.role, KeyboardKeyRole.shift);
    expect(layout.bottomRow.space.role, KeyboardKeyRole.space);
    expect(layout.bottomRow.delete.role, KeyboardKeyRole.delete);
  });

  test('keyboard state toggles alpha -> shift -> caps deterministically', () {
    var state = const KeyboardStateModel.alpha();

    state = state.onShiftTap();
    expect(state.caseState, KeyboardCaseState.shift);

    state = state.onShiftDoubleTap();
    expect(state.caseState, KeyboardCaseState.capsLock);
  });

  test('caps lock survives layer changes back to alpha', () {
    var state = const KeyboardStateModel.alpha(
      caseState: KeyboardCaseState.capsLock,
    );

    state = state.showNumeric();
    state = state.showAlpha();

    expect(state.caseState, KeyboardCaseState.capsLock);
  });
}
