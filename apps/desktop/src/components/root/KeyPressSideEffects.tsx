import { useEffect, useRef } from "react";
import { isEqual } from "lodash-es";
import { getAppState, produceAppState } from "../../store";

const HTML_TO_RDEV: Record<string, string> = {
  // Modifiers
  AltLeft: "Alt",
  AltRight: "AltGr",

  // Arrow keys
  ArrowDown: "DownArrow",
  ArrowUp: "UpArrow",
  ArrowLeft: "LeftArrow",
  ArrowRight: "RightArrow",

  // Enter
  Enter: "Return",
  NumpadEnter: "KpReturn",

  // Number row
  Digit1: "Num1",
  Digit2: "Num2",
  Digit3: "Num3",
  Digit4: "Num4",
  Digit5: "Num5",
  Digit6: "Num6",
  Digit7: "Num7",
  Digit8: "Num8",
  Digit9: "Num9",
  Digit0: "Num0",

  // Punctuation / symbols
  BracketLeft: "LeftBracket",
  BracketRight: "RightBracket",
  Semicolon: "SemiColon",
  Backquote: "BackQuote",
  Backslash: "BackSlash",
  Period: "Dot",

  // Numpad
  Numpad0: "Kp0",
  Numpad1: "Kp1",
  Numpad2: "Kp2",
  Numpad3: "Kp3",
  Numpad4: "Kp4",
  Numpad5: "Kp5",
  Numpad6: "Kp6",
  Numpad7: "Kp7",
  Numpad8: "Kp8",
  Numpad9: "Kp9",
  NumpadDecimal: "KpDecimal",
  NumpadAdd: "KpPlus",
  NumpadSubtract: "KpMinus",
  NumpadMultiply: "KpMultiply",
  NumpadDivide: "KpDivide",
  NumpadEqual: "KpEqual",
};

const htmlCodeToRdevLabel = (code: string): string => {
  return HTML_TO_RDEV[code] ?? code;
};

export const KeyPressSideEffects = () => {
  const pressedRef = useRef(new Set<string>());

  useEffect(() => {
    const emitKeysHeld = () => {
      const keys = Array.from(pressedRef.current).sort();
      const existing = getAppState().keysHeld;
      if (!isEqual(existing, keys)) {
        produceAppState((draft) => {
          draft.keysHeld = keys;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const label = htmlCodeToRdevLabel(e.code);
      if (!pressedRef.current.has(label)) {
        pressedRef.current.add(label);
        emitKeysHeld();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const label = htmlCodeToRdevLabel(e.code);
      if (pressedRef.current.delete(label)) {
        emitKeysHeld();
      }
    };

    const handleBlur = () => {
      if (pressedRef.current.size > 0) {
        pressedRef.current.clear();
        emitKeysHeld();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return null;
};
