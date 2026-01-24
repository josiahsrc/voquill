import { Box, LinearProgress, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState, useAppStore } from "../../store";
import type { OverlayPhase } from "../../types/overlay.types";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { AudioWaveform } from "../common/AudioWaveform";
import { HotkeyBadge } from "../common/HotkeyBadge";

export const PILL_OVERLAY_WIDTH = 300;
export const PILL_OVERLAY_HEIGHT = 96;
export const MIN_PILL_WIDTH = 48;
export const MIN_PILL_HEIGHT = 6;
export const MIN_PILL_HOVER_PADDING = 12;
export const EXPANDED_PILL_WIDTH = 120;
export const EXPANDED_PILL_HEIGHT = 32;

type PillExpandedPayload = {
  expanded: boolean;
  hovered: boolean;
};

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
};

export const PillOverlayRoot = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const theme = useTheme();
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const hotkeyKeys = combos.length > 0 ? combos[0] : ["?"];
  const phase = useAppStore((state) => state.overlayPhase);
  const levels = useAppStore((state) => state.audioLevels);

  const isIdle = phase === "idle";
  const isListening = phase === "recording";
  const isProcessing = phase === "loading";

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "transparent";
  }, []);

  useTauriListen<PillExpandedPayload>("pill_expanded", (payload) => {
    setIsExpanded(payload.expanded);
    setIsHovered(payload.hovered);
  });

  useTauriListen<OverlayPhasePayload>("overlay_phase", (payload) => {
    produceAppState((draft) => {
      draft.overlayPhase = payload.phase;
      if (payload.phase !== "recording") {
        draft.audioLevels = [];
      }
    });
  });

  useTauriListen<RecordingLevelPayload>("recording_level", (payload) => {
    const raw = Array.isArray(payload.levels) ? payload.levels : [];
    const sanitized = raw.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0,
    );
    produceAppState((draft) => {
      draft.audioLevels = sanitized;
    });
  });

  const handleMouseDownDictate = (e: React.MouseEvent) => {
    e.preventDefault();
    invoke("restore_overlay_focus").catch(() => {});
    emitTo("main", "on-click-dictate", {}).catch(console.error);
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {/* Tooltip */}
      <Box
        sx={{
          opacity: isHovered && isIdle ? 1 : 0,
          transform: isHovered && isIdle ? "translateY(0)" : "translateY(4px)",
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

      {/* Pill with hover zone */}
      <Box
        sx={{
          paddingBottom: `${MIN_PILL_HOVER_PADDING}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          onMouseDown={handleMouseDownDictate}
          sx={{
            position: "relative",
            width: isExpanded ? EXPANDED_PILL_WIDTH : MIN_PILL_WIDTH,
            height: isExpanded ? EXPANDED_PILL_HEIGHT : MIN_PILL_HEIGHT,
            borderRadius: isExpanded ? theme.spacing(2) : theme.spacing(0.75),
            backgroundColor: alpha(
              theme.palette.common.black,
              isExpanded ? 0.92 : 0.6,
            ),
            border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
            backdropFilter: "blur(14px)",
            transition: "all 200ms ease-out",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          {/* Inner content container */}
          <Box
            sx={{
              position: "relative",
              width: EXPANDED_PILL_WIDTH - 8,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isExpanded ? 1 : 0,
              transition: "opacity 150ms ease-out",
            }}
          >
            {/* Click to dictate text */}
            {isHovered && (
              <Typography
                sx={{
                  position: "absolute",
                  color: alpha(theme.palette.common.white, 0.4),
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  opacity: isIdle ? 1 : 0,
                  transition: "opacity 150ms ease-out",
                }}
              >
                <FormattedMessage defaultMessage="Click to dictate" />
              </Typography>
            )}

            {/* Processing indicator */}
            <Box
              sx={{
                position: "absolute",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isProcessing ? 1 : 0,
                transition: "opacity 150ms ease-out",
              }}
            >
              <LinearProgress sx={{ width: "100%", height: "2px" }} />
            </Box>

            {/* Audio waveform */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                opacity: isListening ? 1 : 0,
                transition: "opacity 150ms ease-out",
              }}
            >
              <AudioWaveform
                levels={levels}
                active={isListening}
                processing={isProcessing}
                strokeColor={theme.palette.common.white}
                width={EXPANDED_PILL_WIDTH}
                height={EXPANDED_PILL_HEIGHT}
                baselineOffset={0}
              />
            </Box>

            {/* Gradient overlay for waveform edges */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: isIdle ? 0 : 1,
                transition: "opacity 150ms ease-out",
                background: `linear-gradient(90deg, ${alpha(
                  theme.palette.common.black,
                  0.9,
                )} 0%, transparent 18%, transparent 85%, ${alpha(
                  theme.palette.common.black,
                  0.9,
                )} 100%)`,
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
