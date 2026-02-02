import { Box, keyframes } from "@mui/material";
import { emitTo } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { produceAppState, useAppStore } from "../../store";
import { ToastAction } from "../../types/toast.types";
import { ToastItem } from "../toast/ToastItem";

const TOAST_CONTENT_WIDTH = 350;
const ANIMATION_IN_MS = 350;
const ANIMATION_OUT_MS = 150;

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

export const ToastSection = () => {
  const currentToast = useAppStore((state) => state.currentToast);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [displayedToast, setDisplayedToast] = useState(currentToast);

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
    if (currentToast) {
      setIsAnimatingOut(false);
      setDisplayedToast(currentToast);
    } else if (displayedToast && !isAnimatingOut) {
      setIsAnimatingOut(true);
    }
  }, [currentToast, displayedToast, isAnimatingOut]);

  useEffect(() => {
    if (!isAnimatingOut) return;

    const timer = setTimeout(() => {
      setDisplayedToast(null);
      setIsAnimatingOut(false);
    }, ANIMATION_OUT_MS);

    return () => clearTimeout(timer);
  }, [isAnimatingOut]);

  if (!displayedToast) {
    return null;
  }

  return (
    <Box
      key={displayedToast.id}
      sx={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        pointerEvents: "none",
      }}
    >
      <Box
        data-overlay-interactive
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
