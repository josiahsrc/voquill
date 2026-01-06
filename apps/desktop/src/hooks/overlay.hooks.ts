import {
  cursorPosition,
  getCurrentWindow,
  Window,
} from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState, RefObject } from "react";

type ContentRef = RefObject<HTMLElement | null>;

type UseUnifiedClickThroughOptions = {
  contentRefs: ContentRef[];
  enabled: boolean;
  windowRef?: Window;
};

export const useUnifiedClickThrough = ({
  contentRefs,
  enabled,
  windowRef: providedWindowRef,
}: UseUnifiedClickThroughOptions) => {
  const defaultWindowRef = useMemo(() => getCurrentWindow(), []);
  const windowRef = providedWindowRef ?? defaultWindowRef;

  useEffect(() => {
    if (!enabled) return;

    let isOverContent = false;
    let animationFrame: number;

    const checkCursorPosition = async () => {
      try {
        const cursor = await cursorPosition();
        const windowPos = await windowRef.outerPosition();
        const scaleFactor = (await windowRef.scaleFactor()) ?? 1;

        const relativeX = (cursor.x - windowPos.x) / scaleFactor;
        const relativeY = (cursor.y - windowPos.y) / scaleFactor;

        let nowOverContent = false;

        for (const ref of contentRefs) {
          const content = ref.current;
          if (!content) continue;

          const rect = content.getBoundingClientRect();
          if (
            relativeX >= rect.left &&
            relativeX <= rect.right &&
            relativeY >= rect.top &&
            relativeY <= rect.bottom
          ) {
            nowOverContent = true;
            break;
          }
        }

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
  }, [windowRef, enabled, contentRefs]);
};

type UseOverlayDragOptions = {
  elementWidth: number;
  headerHeight: number;
  initialMargin?: { left: number; top: number };
};

type UseOverlayDragResult = {
  offset: { x: number; y: number };
  isDragging: boolean;
  handleDragStart: (e: React.MouseEvent) => void;
  reset: () => void;
};

export const useOverlayDrag = ({
  elementWidth,
  headerHeight,
  initialMargin = { left: 0, top: 0 },
}: UseOverlayDragOptions): UseOverlayDragResult => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    },
    [offset]
  );

  const reset = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      let newX = dragStartRef.current.offsetX + deltaX;
      let newY = dragStartRef.current.offsetY + deltaY;

      const minX = -initialMargin.left;
      const maxX = window.innerWidth - initialMargin.left - elementWidth;
      const minY = -initialMargin.top;
      const maxY = window.innerHeight - initialMargin.top - headerHeight;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setOffset({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, initialMargin, elementWidth, headerHeight]);

  return { offset, isDragging, handleDragStart, reset };
};
