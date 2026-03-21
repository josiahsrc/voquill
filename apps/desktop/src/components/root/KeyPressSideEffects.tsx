import { useEffect, useRef } from "react";
import { isEqual } from "lodash-es";
import { getAppState, produceAppState } from "../../store";

const htmlCodeToRdevLabel = (code: string): string => {
  switch (code) {
    case "ArrowDown":
      return "DownArrow";
    case "ArrowUp":
      return "UpArrow";
    case "ArrowLeft":
      return "LeftArrow";
    case "ArrowRight":
      return "RightArrow";
    case "Enter":
      return "Return";
    case "NumpadEnter":
      return "Return";
    default:
      return code;
  }
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
