# Modifier-only hotkey grab regressions

## What happened
- A fix to key suppression prevented stuck modifiers by only suppressing key-up for keys suppressed on key-down.
- That exposed a regression for modifier-only combos like `Meta+Control`: pressing `Meta` first then `Control` could open the Windows menu.

## Lesson
- Modifier-only global hotkeys must not be OS-suppressed in the native grab layer.
- We should still track them for app activation, but pass their OS events through to avoid shell/menu side effects caused by partial suppression.

## Guardrail
- Keep tests for both key orders on modifier-only combos and assert full pass-through behavior.
- Keep tests for overlap cases where a modifier-only combo and a modifier+key combo share a prefix (example: `Function` and `Function+KeyZ`) and assert suppression escalates when the non-modifier key is pressed.
