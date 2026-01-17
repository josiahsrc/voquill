import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { emitTo, listen } from "@tauri-apps/api/event";
import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
  getPrettyKeyName,
} from "../../utils/keyboard.utils";
import { getPlatform } from "../../utils/platform.utils";
import { RecordingStatusWidget } from "./RecordingStatusWidget";

const EXPANDED_WIDTH = 180;
const EXPANDED_HEIGHT = 32;
const COLLAPSED_WIDTH = 48;
const COLLAPSED_HEIGHT = 6;
const HOVERED_WIDTH = 56;
const HOVERED_HEIGHT = 8;
const HOVER_PADDING = 20; // Extra padding around pill for easier hover detection

export const WaveformSection = () => {
  const theme = useTheme();
  const phase = useAppStore((state) => state.overlayPhase);
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const isExpanded = phase !== "idle";
  const isMacOS = getPlatform() === "macos";
  const [isHovered, setIsHovered] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);

  // Keep ref in sync with state for use in event handlers
  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  // Check if cursor is over the pill
  const checkIsOverPill = useCallback(async (): Promise<boolean> => {
    if (!pillRef.current) return false;

    try {
      const cursor = await cursorPosition();
      const window = getCurrentWindow();
      const windowPos = await window.outerPosition();
      const scaleFactor = (await window.scaleFactor()) ?? 1;

      const relativeX = (cursor.x - windowPos.x) / scaleFactor;
      const relativeY = (cursor.y - windowPos.y) / scaleFactor;

      const rect = pillRef.current.getBoundingClientRect();
      return (
        relativeX >= rect.left - HOVER_PADDING &&
        relativeX <= rect.right + HOVER_PADDING &&
        relativeY >= rect.top - HOVER_PADDING &&
        relativeY <= rect.bottom + HOVER_PADDING
      );
    } catch {
      return false;
    }
  }, []);

  // Track cursor position to detect hover (since overlay is click-through)
  const checkHover = useCallback(async () => {
    if (isExpanded) {
      setIsHovered(false);
      return;
    }
    const isOver = await checkIsOverPill();
    setIsHovered(isOver);
  }, [isExpanded, checkIsOverPill]);

  useEffect(() => {
    if (isMacOS || isExpanded) {
      setIsHovered(false);
      return;
    }

    const interval = setInterval(checkHover, 100);
    return () => clearInterval(interval);
  }, [isMacOS, isExpanded, checkHover]);

  // Listen for global mouse clicks and toggle dictation if over pill
  useEffect(() => {
    if (isMacOS) return;

    const unlistenPromise = listen<{ button: string }>(
      "global-mouse-click",
      async (event) => {
        // Only respond to left clicks
        if (event.payload.button !== "left") return;

        // Check if cursor is over the pill
        const isOver = await checkIsOverPill();
        if (isOver || isHoveredRef.current) {
          emitTo("main", "waveform-toggle-dictation", {}).catch(console.error);
        }
      },
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [isMacOS, checkIsOverPill]);

  if (isMacOS) {
    return null;
  }

  // Format the first hotkey combo for display
  const hotkeyLabel =
    combos.length > 0
      ? combos[0].map((key) => getPrettyKeyName(key)).join(" + ")
      : "F8";

  // Determine dimensions based on state
  const getWidth = () => {
    if (isExpanded) return EXPANDED_WIDTH;
    if (isHovered) return HOVERED_WIDTH;
    return COLLAPSED_WIDTH;
  };

  const getHeight = () => {
    if (isExpanded) return EXPANDED_HEIGHT;
    if (isHovered) return HOVERED_HEIGHT;
    return COLLAPSED_HEIGHT;
  };

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "5%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Tooltip */}
      <Box
        sx={{
          opacity: isHovered && !isExpanded ? 1 : 0,
          transform: isHovered && !isExpanded ? "translateY(0)" : "translateY(4px)",
          transition: "all 150ms ease-out",
          marginBottom: theme.spacing(1),
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.common.black, 0.92),
            backdropFilter: "blur(14px)",
            borderRadius: theme.spacing(1.5),
            padding: `${theme.spacing(0.75)} ${theme.spacing(1.5)}`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.common.white,
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            <FormattedMessage
              defaultMessage="Click or hold {hotkey} to start dictating"
              values={{
                hotkey: hotkeyLabel,
              }}
            />
          </Typography>
        </Box>
      </Box>

      {/* Pill - purely visual, no pointer events since overlay is click-through */}
      <Box
        ref={pillRef}
        sx={{
          width: `${getWidth()}px`,
          height: `${getHeight()}px`,
          borderRadius: isExpanded ? theme.spacing(2) : theme.spacing(0.75),
          backgroundColor: alpha(
            theme.palette.common.black,
            isExpanded ? 0.92 : isHovered ? 0.75 : 0.6,
          ),
          backdropFilter: "blur(14px)",
          boxShadow: isExpanded
            ? `0 10px 35px ${alpha(theme.palette.common.black, 0.36)}`
            : `0 2px 8px ${alpha(theme.palette.common.black, 0.2)}`,
          transition: "all 200ms ease-out",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 150ms ease-out",
            pointerEvents: "none",
          }}
        >
          {isExpanded && <RecordingStatusWidget />}
        </Box>
      </Box>
    </Box>
  );
};
