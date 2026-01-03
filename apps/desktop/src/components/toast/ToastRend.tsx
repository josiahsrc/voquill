import { Box, keyframes } from "@mui/material";
import { emitTo } from "@tauri-apps/api/event";
import {
  availableMonitors,
  cursorPosition,
  getCurrentWindow,
  LogicalPosition,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { produceAppState, useAppStore } from "../../store";
import { ToastAction } from "../../types/toast.types";
import { getPlatform } from "../../utils/platform.utils";
import { ToastItem } from "./ToastItem";

const TOAST_WINDOW_WIDTH = 700; // Matches Rust window width
const TOAST_CONTENT_WIDTH = 350;
const TOP_MARGIN = 0;
const RIGHT_MARGIN = 0;
const ANIMATION_IN_MS = 350;
const ANIMATION_OUT_MS = 150;

// Elastic slide in from right with overshoot
const slideIn = keyframes`
  0% {
    transform: translateX(20%) scale(0.9);
    opacity: 0;
  }
  50% {
    transform: translateX(-3%) scale(1.02);
    opacity: 1;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
`;

// Smooth slide out to right with fade
const slideOut = keyframes`
  0% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateX(10%) scale(0.95);
    opacity: 0;
  }
`;

export const ToastRend = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);
  const currentToast = useAppStore((state) => state.currentToast);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [displayedToast, setDisplayedToast] = useState(currentToast);
  const contentRef = useRef<HTMLDivElement>(null);

  const hasToast = currentToast !== null;

  const handleClose = useCallback(() => {
    produceAppState((draft) => {
      draft.currentToast = null;
    });
  }, []);

  const handleAction = useCallback((action: ToastAction) => {
    produceAppState((draft) => {
      draft.currentToast = null;
    });

    emitTo("main", "toast-action", { action }).catch(console.error);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";
  }, []);

  // Poll cursor position to toggle click-through based on whether mouse
  // is over the content area. We use Tauri's cursorPosition API since it
  // works even when the window is set to ignore cursor events.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !displayedToast) return;

    let isOverContent = false;
    let animationFrame: number;

    const checkCursorPosition = async () => {
      try {
        const cursor = await cursorPosition();
        const windowPos = await windowRef.outerPosition();
        const scaleFactor = (await windowRef.scaleFactor()) ?? 1;

        // Convert cursor position to window-relative coordinates
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

    // Start with click-through enabled
    windowRef.setIgnoreCursorEvents(true).catch(console.error);
    animationFrame = requestAnimationFrame(checkCursorPosition);

    return () => {
      cancelAnimationFrame(animationFrame);
      windowRef.setIgnoreCursorEvents(true).catch(console.error);
    };
  }, [windowRef, displayedToast]);

  useEffect(() => {
    if (currentToast) {
      setIsAnimatingOut(false);
      setDisplayedToast(currentToast);
    } else if (displayedToast && !isAnimatingOut) {
      setIsAnimatingOut(true);
    }
  }, [currentToast, displayedToast, isAnimatingOut]);

  useEffect(() => {
    if (!isAnimatingOut) return;

    const timer = setTimeout(async () => {
      try {
        // Reset to click-through before hiding
        await windowRef.setIgnoreCursorEvents(true);
        await windowRef.hide();
      } catch {
        // Ignore errors
      }
      setDisplayedToast(null);
      setIsAnimatingOut(false);
    }, ANIMATION_OUT_MS);

    return () => clearTimeout(timer);
  }, [isAnimatingOut, windowRef]);

  useEffect(() => {
    let canceled = false;
    const shouldShow = hasToast && !isAnimatingOut;

    const syncVisibility = async () => {
      try {
        if (shouldShow) {
          const [monitors, cursor] = await Promise.all([
            availableMonitors().catch(() => null),
            cursorPosition().catch(() => null),
          ]);

          const targetMonitor =
            monitors?.find((monitor) => {
              if (!cursor) {
                return false;
              }
              const withinX =
                cursor.x >= monitor.position.x &&
                cursor.x < monitor.position.x + monitor.size.width;
              const withinY =
                cursor.y >= monitor.position.y &&
                cursor.y < monitor.position.y + monitor.size.height;
              return withinX && withinY;
            }) ??
            monitors?.[0] ??
            null;

          if (canceled) {
            return;
          }

          if (targetMonitor) {
            const platform = getPlatform();
            const scaleFactor = targetMonitor.scaleFactor ?? 1;

            if (platform === "windows") {
              const physicalWindowWidth = Math.round(
                TOAST_WINDOW_WIDTH * scaleFactor,
              );
              const physicalX = Math.round(
                targetMonitor.position.x +
                  targetMonitor.size.width -
                  physicalWindowWidth -
                  RIGHT_MARGIN * scaleFactor,
              );
              const physicalY = Math.round(
                targetMonitor.position.y + TOP_MARGIN * scaleFactor,
              );
              await windowRef.setPosition(
                new PhysicalPosition(physicalX, physicalY),
              );
            } else {
              const logicalWidth = targetMonitor.size.width / scaleFactor;
              const logicalX = Math.round(
                targetMonitor.position.x / scaleFactor +
                  logicalWidth -
                  TOAST_WINDOW_WIDTH -
                  RIGHT_MARGIN,
              );
              const logicalY = Math.round(
                targetMonitor.position.y / scaleFactor + TOP_MARGIN,
              );
              await windowRef.setPosition(
                new LogicalPosition(logicalX, logicalY),
              );
            }
          }

          if (canceled) {
            return;
          }

          await windowRef.show();
          await windowRef.setAlwaysOnTop(true);
        }
      } catch (err) {
        if (!canceled) {
          console.error("Failed to toggle toast visibility", err);
        }
      }
    };

    syncVisibility().catch(() => {});

    return () => {
      canceled = true;
    };
  }, [windowRef, hasToast, isAnimatingOut]);

  if (!displayedToast) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        backgroundColor: "transparent",
        pointerEvents: "none",
        padding: 1,
      }}
    >
      <Box
        ref={contentRef}
        sx={{
          animation: `${isAnimatingOut ? slideOut : slideIn} ${isAnimatingOut ? ANIMATION_OUT_MS : ANIMATION_IN_MS}ms ease-out forwards`,
          pointerEvents: "auto",
          width: TOAST_CONTENT_WIDTH - 16,
        }}
      >
        <ToastItem
          toast={displayedToast}
          onClose={handleClose}
          onAction={handleAction}
        />
      </Box>
    </Box>
  );
};
