import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppStore } from "../store";

const INTERACTIVE_ATTR = "data-overlay-interactive";

type UseOverlayClickThroughOptions = {
  enabled: boolean;
  windowRef?: Window;
};

export const useOverlayClickThrough = ({
  enabled,
  windowRef: providedWindowRef,
}: UseOverlayClickThroughOptions) => {
  const defaultWindowRef = useMemo(() => getCurrentWindow(), []);
  const windowRef = providedWindowRef ?? defaultWindowRef;
  const cursor = useAppStore((state) => state.overlayCursor);
  const isOverInteractiveRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const isOverInteractive = (() => {
      if (!cursor) return false;
      const element = document.elementFromPoint(cursor.x, cursor.y);
      return element?.closest(`[${INTERACTIVE_ATTR}]`) !== null;
    })();

    if (isOverInteractive !== isOverInteractiveRef.current) {
      isOverInteractiveRef.current = isOverInteractive;
      windowRef.setIgnoreCursorEvents(!isOverInteractive).catch(() => {});
    }
  }, [cursor, enabled, windowRef]);

  useEffect(() => {
    if (!enabled) return;
    windowRef.setIgnoreCursorEvents(true).catch(() => {});
    return () => {
      windowRef.setIgnoreCursorEvents(true).catch(() => {});
    };
  }, [enabled, windowRef]);
};

export const useUnifiedClickThrough = useOverlayClickThrough;

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
    [offset],
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
