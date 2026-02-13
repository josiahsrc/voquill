import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { useRef } from "react";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { getOverlayBottomOffset } from "../../utils/platform.utils";
import {
  getEffectivePillVisibility,
  getIsDictationUnlocked,
} from "../../utils/user.utils";
import { HotkeyBadge } from "../common/HotkeyBadge";
import { RecordingStatusWidget } from "./RecordingStatusWidget";

const EXPANDED_WIDTH = 120;
const EXPANDED_HEIGHT = 32;
const COLLAPSED_WIDTH = 48;
const COLLAPSED_HEIGHT = 6;

const HOVER_PADDING = 8;

export const WaveformSection = () => {
  const theme = useTheme();
  const overlayPhase = useAppStore((state) => state.overlayPhase);
  const cursor = useAppStore((state) => state.overlayCursor);
  const bottomOffsetPx = getOverlayBottomOffset();
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const dictationPillVisibility = useAppStore((state) =>
    getEffectivePillVisibility(state.userPrefs?.dictationPillVisibility),
  );
  const isDictationUnlocked = useAppStore(getIsDictationUnlocked);
  const isHoveredRef = useRef(false);
  const hotkeyKeys = combos.length > 0 ? combos[0] : ["?"];

  const checkCursorInBounds = (width: number, height: number) => {
    if (!cursor) return false;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const waveformCenterX = screenWidth / 2;
    const waveformCenterY = screenHeight - bottomOffsetPx - height / 2;
    const dx = Math.abs(cursor.x - waveformCenterX);
    const dy = Math.abs(cursor.y - waveformCenterY);
    return dx <= width / 2 + HOVER_PADDING && dy <= height / 2 + HOVER_PADDING;
  };

  if (isHoveredRef.current) {
    if (!checkCursorInBounds(EXPANDED_WIDTH * 1.5, EXPANDED_HEIGHT * 1.5)) {
      isHoveredRef.current = false;
    }
  } else {
    if (checkCursorInBounds(COLLAPSED_WIDTH, COLLAPSED_HEIGHT)) {
      isHoveredRef.current = true;
    }
  }

  const handleMouseDownDictate = (e: React.MouseEvent) => {
    e.preventDefault();
    invoke("restore_overlay_focus").catch(() => {});
    emitTo("main", "on-click-dictate", {}).catch(console.error);
  };

  const handleCancelDictation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    invoke("restore_overlay_focus").catch(() => {});
    emitTo("main", "cancel-dictation", {}).catch(console.error);
  };

  const isOverlayActive = overlayPhase !== "idle";
  const isVisible =
    isDictationUnlocked &&
    dictationPillVisibility !== "hidden" &&
    (isOverlayActive || dictationPillVisibility !== "while_active");

  const isExpanded = isOverlayActive || isHoveredRef.current;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: `${bottomOffsetPx}px`,
        left: "50%",
        transform: isVisible ? "translateX(-50%)" : "translateX(-50%) translateY(8px)",
        opacity: isVisible ? 1 : 0,
        transition: isVisible
          ? "opacity 100ms ease-out, transform 100ms ease-out, bottom 200ms ease-out, visibility 0ms"
          : "opacity 100ms ease-out, transform 100ms ease-out, bottom 200ms ease-out, visibility 0ms 100ms",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        pointerEvents: "none",
        visibility: isVisible ? "visible" : "hidden",
      }}
    >
      {/* Tooltip */}
      <Box
        sx={{
          opacity: isHoveredRef.current ? 1 : 0,
          transform: isHoveredRef.current ? "translateY(0)" : "translateY(4px)",
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
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
            component="span"
          >
            <FormattedMessage
              defaultMessage="You can also hold {hotkey} to dictate"
              values={{
                hotkey: (
                  <HotkeyBadge
                    keys={hotkeyKeys}
                    sx={{
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      borderColor: alpha(theme.palette.common.white, 0.3),
                      color: theme.palette.common.white,
                      fontSize: "inherit",
                      py: 0,
                      px: 0.75,
                    }}
                  />
                ),
              }}
            />
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          position: "relative",
        }}
      >
        <Box
          data-overlay-interactive
          onMouseDown={handleMouseDownDictate}
          sx={{
            width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
            height: isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
            borderRadius: isExpanded ? theme.spacing(2) : theme.spacing(0.75),
            backgroundColor: alpha(
              theme.palette.common.black,
              isExpanded ? 0.92 : 0.6,
            ),
            border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
            backdropFilter: "blur(14px)",
            boxShadow: isExpanded
              ? `0 10px 35px ${alpha(theme.palette.common.black, 0.36)}`
              : `0 2px 8px ${alpha(theme.palette.common.black, 0.2)}`,
            transition: "all 200ms ease-out",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
            cursor: "pointer",
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

        {/* Cancel button */}
        <IconButton
          onMouseDown={handleCancelDictation}
          size="small"
          sx={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 18,
            height: 18,
            backgroundColor: "#dc3545",
            opacity: isOverlayActive ? 1 : 0,
            transform: isOverlayActive ? "scale(1)" : "scale(0)",
            pointerEvents: isOverlayActive ? "auto" : "none",
            transition: "opacity 200ms ease-out, transform 200ms ease-out",
            color: theme.palette.common.white,
            zIndex: 1,
            "&:hover": {
              backgroundColor: "#c82333",
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Box>
    </Box>
  );
};
