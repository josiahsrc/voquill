import 'package:app/model/keyboard/keyboard_layout_model.dart';
import 'package:app/model/keyboard/keyboard_state_model.dart';
import 'package:app/model/keyboard/keyboard_toolbar_model.dart';
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

  test('toolbar exposes a distinct persistent language action', () {
    final toolbar = KeyboardToolbarModel.standard();

    expect(toolbar.language.role, KeyboardKeyRole.language);
    expect(toolbar.persistentActions.map((action) => action.role), [
      KeyboardKeyRole.startStop,
      KeyboardKeyRole.language,
      KeyboardKeyRole.mode,
    ]);
  });

  test('layout copyWith overrides shared contract fields', () {
    final layout = KeyboardLayoutModel.englishQwerty();
    const customBottomRow = KeyboardBottomRowModel(
      mode: KeyboardKeyModel.action(
        id: 'custom-mode',
        role: KeyboardKeyRole.mode,
        label: 'ABC',
      ),
      globe: KeyboardKeyModel.action(
        id: 'custom-globe',
        role: KeyboardKeyRole.globe,
        label: '🌐',
      ),
      space: KeyboardKeyModel.action(
        id: 'custom-space',
        role: KeyboardKeyRole.space,
        label: 'space',
        flex: 5,
      ),
      delete: KeyboardKeyModel.action(
        id: 'custom-delete',
        role: KeyboardKeyRole.delete,
        label: '⌫',
      ),
      enter: KeyboardKeyModel.action(
        id: 'custom-enter',
        role: KeyboardKeyRole.enter,
        label: 'go',
      ),
    );
    const customToolbar = KeyboardToolbarModel(
      startStop: KeyboardKeyModel.action(
        id: 'custom-start-stop',
        role: KeyboardKeyRole.startStop,
        label: 'Start/Stop',
      ),
      language: KeyboardKeyModel.action(
        id: 'custom-language',
        role: KeyboardKeyRole.language,
        label: 'Language',
      ),
      mode: KeyboardKeyModel.action(
        id: 'custom-toolbar-mode',
        role: KeyboardKeyRole.mode,
        label: 'Mode',
      ),
      overflow: KeyboardKeyModel.action(
        id: 'custom-overflow',
        role: KeyboardKeyRole.overflow,
        label: 'More',
      ),
    );

    final updatedLayout = layout.copyWith(
      languageCode: 'fr',
      bottomRow: customBottomRow,
      toolbar: customToolbar,
    );

    expect(updatedLayout.languageCode, 'fr');
    expect(updatedLayout.bottomRow, customBottomRow);
    expect(updatedLayout.toolbar, customToolbar);
  });

  test('shift double tap is ignored outside alpha layer', () {
    final state = const KeyboardStateModel.numeric();

    final updatedState = state.onShiftDoubleTap();

    expect(updatedState.layerState, KeyboardLayerState.numeric);
    expect(updatedState.caseState, KeyboardCaseState.lower);
  });
}
