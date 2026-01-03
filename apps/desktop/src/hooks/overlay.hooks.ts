import {
  cursorPosition,
  getCurrentWindow,
  Window,
} from "@tauri-apps/api/window";
import { useEffect, useMemo, RefObject } from "react";

type UseOverlayClickThroughOptions = {
  contentRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  windowRef?: Window;
};

export const useOverlayClickThrough = ({
  contentRef,
  enabled,
  windowRef: providedWindowRef,
}: UseOverlayClickThroughOptions) => {
  const defaultWindowRef = useMemo(() => getCurrentWindow(), []);
  const windowRef = providedWindowRef ?? defaultWindowRef;

  useEffect(() => {
    if (!enabled) return;

    let isOverContent = false;
    let animationFrame: number;

    const checkCursorPosition = async () => {
      const content = contentRef.current;
      if (!content) {
        animationFrame = requestAnimationFrame(checkCursorPosition);
        return;
      }

      try {
        const cursor = await cursorPosition();
        const windowPos = await windowRef.outerPosition();
        const scaleFactor = (await windowRef.scaleFactor()) ?? 1;

        const relativeX = (cursor.x - windowPos.x) / scaleFactor;
        const relativeY = (cursor.y - windowPos.y) / scaleFactor;

        const rect = content.getBoundingClientRect();
        const nowOverContent =
          relativeX >= rect.left &&
          relativeX <= rect.right &&
          relativeY >= rect.top &&
          relativeY <= rect.bottom;

        if (nowOverContent !== isOverContent) {
          isOverContent = nowOverContent;
          await windowRef.setIgnoreCursorEvents(!nowOverContent);
        }
      } catch {
        // Ignore errors (window may be closing)
      }

      animationFrame = requestAnimationFrame(checkCursorPosition);
    };

    windowRef.setIgnoreCursorEvents(true).catch(console.error);
    animationFrame = requestAnimationFrame(checkCursorPosition);

    return () => {
      cancelAnimationFrame(animationFrame);
      windowRef.setIgnoreCursorEvents(true).catch(console.error);
    };
  }, [windowRef, enabled, contentRef]);
};
