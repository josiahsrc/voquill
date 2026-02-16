import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, LinearProgress, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { produceAppState, useAppStore } from "../../store";
import type {
  OverlayPhase,
  OverlaySyncPayload,
} from "../../types/overlay.types";
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { getManuallySelectedToneId, getToneById } from "../../utils/tone.utils";
import {
  getEffectivePillVisibility,
  getIsDictationUnlocked,
} from "../../utils/user.utils";
import { AudioWaveform } from "../common/AudioWaveform";
import { HotkeyBadge } from "../common/HotkeyBadge";

export const PILL_OVERLAY_WIDTH = 256;
export const PILL_OVERLAY_HEIGHT = 96;
export const MIN_PILL_WIDTH = 48;
export const MIN_PILL_HEIGHT = 6;
export const MIN_PILL_HOVER_PADDING = 4;
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

type FlashPillPayload = {
  duration: number;
};

export const PillOverlayRoot = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFlashingTooltip, setIsFlashingTooltip] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useTheme();
  const phase = useAppStore((state) => state.overlayPhase);
  const levels = useAppStore((state) => state.audioLevels);
  const isManualMode = useAppStore(
    (state) => getEffectiveStylingMode(state) === "manual",
  );
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const hotkeyKeys = combos.length > 0 ? combos[0] : ["?"];

  const activeToneName = useAppStore((state) => {
    const toneId = getManuallySelectedToneId(state);
    return getToneById(state, toneId)?.name ?? "-";
  });

  const isIdle = phase === "idle";
  const isListening = phase === "recording";
  const isProcessing = phase === "loading";
  const overlayShown =
    (isHovered && isIdle) || isFlashingTooltip || (isManualMode && isListening);
  const showStyleSwitchers = isHovered || (isManualMode && isListening);
  const flashingInfo = isFlashingTooltip && !showStyleSwitchers;

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

  useTauriListen<FlashPillPayload>("flash_pill_tooltip", (payload) => {
    setIsFlashingTooltip(true);
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = setTimeout(() => {
      setIsFlashingTooltip(false);
      flashTimerRef.current = null;
    }, payload.duration);
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

  useTauriListen<OverlaySyncPayload>("overlay_sync", (payload) => {
    produceAppState((draft) => {
      Object.assign(draft, payload);
    });
  });

  useEffect(() => {
    emitTo("main", "overlay_ready", { windowLabel: "pill-overlay" }).catch(
      console.error,
    );
  }, []);

  const dictationPillVisibility = useAppStore((state) =>
    getEffectivePillVisibility(state.userPrefs?.dictationPillVisibility),
  );
  const isDictationUnlocked = useAppStore(getIsDictationUnlocked);

  const isOverlayActive = !isIdle;
  const isVisible =
    isDictationUnlocked &&
    dictationPillVisibility !== "hidden" &&
    (isOverlayActive || dictationPillVisibility !== "while_active");

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

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
        transition: isVisible
          ? "opacity 100ms ease-out, transform 100ms ease-out"
          : "opacity 100ms ease-out, transform 100ms ease-out, visibility 0ms 100ms",
        visibility: isVisible ? "visible" : "hidden",
      }}
    >
      {/* Tooltip */}
      <Box
        sx={{
          opacity: overlayShown ? 1 : 0,
          transform: overlayShown ? "translateY(0)" : "translateY(4px)",
          transition: "all 150ms ease-out",
          marginBottom: theme.spacing(1),
          pointerEvents: isManualMode && overlayShown ? "auto" : "none",
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
              gap: isManualMode ? 1 : 0.5,
            }}
            component="span"
          >
            {isManualMode ? (
              <>
                <ChevronLeftIcon
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    invoke("restore_overlay_focus").catch(() => {});
                    emitTo("main", "tone-switch-backward", {}).catch(
                      console.error,
                    );
                  }}
                  sx={{
                    fontSize: "16px",
                    cursor: "pointer",
                    padding: "8px",
                    margin: "-8px",
                    boxSizing: "content-box",
                    opacity: showStyleSwitchers ? 1 : 0,
                    width: showStyleSwitchers ? 16 : 0,
                    transition: "opacity 200ms ease-out, width 150ms ease-out",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    width: flashingInfo ? 140 : 82,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    transition: "width 150ms ease-out",
                  }}
                >
                  {activeToneName}
                </Box>
                <ChevronRightIcon
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    invoke("restore_overlay_focus").catch(() => {});
                    emitTo("main", "tone-switch-forward", {}).catch(
                      console.error,
                    );
                  }}
                  sx={{
                    fontSize: "16px",
                    cursor: "pointer",
                    padding: "8px",
                    margin: "-8px",
                    boxSizing: "content-box",
                    opacity: showStyleSwitchers ? 1 : 0,
                    width: showStyleSwitchers ? 16 : 0,
                    transition: "opacity 200ms ease-out, width 150ms ease-out",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                />
              </>
            ) : (
              <FormattedMessage
                defaultMessage="You can also tap {hotkey}"
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
            )}
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
          sx={{
            position: "relative",
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
              opacity: !isIdle && isHovered ? 1 : 0,
              transform: !isIdle && isHovered ? "scale(1)" : "scale(0)",
              pointerEvents: !isIdle && isHovered ? "auto" : "none",
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
    </Box>
  );
};
