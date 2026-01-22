import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { emitTo } from "@tauri-apps/api/event";
import { useRef } from "react";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { getPlatform } from "../../utils/platform.utils";
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
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const dictationPillVisibility = useAppStore(
    (state) => state.userPrefs?.dictationPillVisibility ?? "while_active",
  );
  const isHoveredRef = useRef(false);
  const hotkeyKeys = combos.length > 0 ? combos[0] : ["?"];

  const checkCursorInBounds = (width: number, height: number) => {
    if (!cursor) return false;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const bottomOffset = getPlatform() === "macos" ? 12 : screenHeight * 0.05;
    const waveformCenterX = screenWidth / 2;
    const waveformCenterY = screenHeight - bottomOffset - height / 2;
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

  const handleClickDictate = () => {
    emitTo("main", "on-click-dictate", {}).catch(console.error);
  };

  if (dictationPillVisibility === "hidden") {
    return null;
  }

  const isOverlayActive = overlayPhase !== "idle";
  if (!isOverlayActive && dictationPillVisibility === "while_active") {
    return null;
  }

  const isExpanded = isOverlayActive || isHoveredRef.current;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: getPlatform() === "macos" ? "12px" : "5%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        pointerEvents: "none",
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
        data-overlay-interactive
        onClick={handleClickDictate}
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
    </Box>
  );
};
