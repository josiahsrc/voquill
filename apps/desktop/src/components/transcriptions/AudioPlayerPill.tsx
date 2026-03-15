import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, IconButton, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getTranscriptionRepo } from "../../repos";
import {
  activePlayback,
  buildWaveformOutline,
  DEFAULT_WAVEFORM_BAR_COUNT,
  formatDuration,
  MAX_COMPUTED_BAR_COUNT,
  MIN_COMPUTED_BAR_COUNT,
  MIN_WAVEFORM_BAR_VALUE,
  playWebAudio,
  stopActivePlayback,
  WAVEFORM_BAR_GAP,
  WAVEFORM_BAR_MAX_WIDTH,
  WAVEFORM_BAR_MIN_WIDTH,
} from "../../utils/audio-playback.utils";

export type AudioPlayerPillProps = {
  transcriptionId: string;
  durationMs?: number | null;
  disabled?: boolean;
  actions?: React.ReactNode;
};

export const AudioPlayerPill = ({
  transcriptionId,
  durationMs,
  disabled,
  actions,
}: AudioPlayerPillProps) => {
  const intl = useIntl();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const playbackNonceRef = useRef(0);
  const isPlayingRef = useRef(false);
  const transcriptionIdRef = useRef(transcriptionId);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    transcriptionIdRef.current = transcriptionId;
  }, [transcriptionId]);

  const desiredWaveformBarCount = useMemo(() => {
    if (waveformWidth <= 0) {
      return DEFAULT_WAVEFORM_BAR_COUNT;
    }

    const gap = WAVEFORM_BAR_GAP;
    const availableWidth = waveformWidth;
    const approximateCount = Math.floor(
      (availableWidth + gap) / (WAVEFORM_BAR_MIN_WIDTH + gap),
    );

    return Math.max(
      MIN_COMPUTED_BAR_COUNT,
      Math.min(MAX_COMPUTED_BAR_COUNT, approximateCount),
    );
  }, [waveformWidth]);

  const waveformValues = useMemo(
    () =>
      buildWaveformOutline(
        transcriptionId,
        durationMs,
        desiredWaveformBarCount,
      ),
    [durationMs, desiredWaveformBarCount, transcriptionId],
  );

  const waveformBars = useMemo(() => {
    if (!waveformValues.length) {
      return Array.from(
        { length: desiredWaveformBarCount },
        () => MIN_WAVEFORM_BAR_VALUE,
      );
    }

    return waveformValues;
  }, [desiredWaveformBarCount, waveformValues]);

  const computedBarWidth = useMemo(() => {
    if (waveformWidth <= 0 || waveformBars.length === 0) {
      return WAVEFORM_BAR_MIN_WIDTH;
    }

    const totalGaps = WAVEFORM_BAR_GAP * Math.max(waveformBars.length - 1, 0);
    const availableForBars = Math.max(waveformWidth - totalGaps, 0);
    const widthPerBar = availableForBars / waveformBars.length;

    return Math.max(
      WAVEFORM_BAR_MIN_WIDTH,
      Math.min(WAVEFORM_BAR_MAX_WIDTH, widthPerBar),
    );
  }, [waveformBars.length, waveformWidth]);

  const progressPercent = Math.min(Math.max(playbackProgress, 0), 1) * 100;

  useEffect(() => {
    return () => {
      if (activePlayback?.transcriptionId === transcriptionIdRef.current) {
        stopActivePlayback("stopped");
      }
      setPlaybackProgress(0);
    };
  }, []);

  useEffect(() => {
    const element = waveformContainerRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setWaveformWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      if (typeof window !== "undefined") {
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
      }
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWaveformWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [transcriptionId]);

  const handlePlaybackToggle = useCallback(async () => {
    const currentNonce = playbackNonceRef.current + 1;
    playbackNonceRef.current = currentNonce;

    try {
      if (isPlayingRef.current) {
        stopActivePlayback("stopped");
        return;
      }

      const audioData =
        await getTranscriptionRepo().loadTranscriptionAudio(transcriptionId);

      if (playbackNonceRef.current !== currentNonce) {
        return;
      }

      setIsPlaying(true);
      await playWebAudio(
        transcriptionId,
        audioData,
        (progress) => {
          if (transcriptionIdRef.current === transcriptionId) {
            setPlaybackProgress(progress);
          }
        },
        (reason) => {
          if (transcriptionIdRef.current !== transcriptionId) {
            return;
          }
          setIsPlaying(false);
          if (reason === "ended") {
            setPlaybackProgress(0);
          }
        },
      );
    } catch (error) {
      console.error("Failed to toggle audio playback", error);
      setIsPlaying(false);
      setPlaybackProgress(0);
      showErrorSnackbar(
        intl.formatMessage({ defaultMessage: "Unable to play audio snippet." }),
      );
    }
  }, [transcriptionId, intl]);

  const durationLabel = formatDuration(durationMs);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        borderRadius: 999,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => theme.vars?.palette.level1,
        px: 1,
        py: 0.25,
        gap: 1,
        width: "100%",
        maxWidth: 350,
        alignSelf: "flex-start",
      }}
    >
      <IconButton
        aria-label={
          isPlaying
            ? intl.formatMessage({ defaultMessage: "Pause audio" })
            : intl.formatMessage({ defaultMessage: "Play audio" })
        }
        size="small"
        onClick={handlePlaybackToggle}
        disabled={disabled}
        sx={{ p: 0.5 }}
      >
        {isPlaying ? (
          <PauseRoundedIcon fontSize="small" />
        ) : (
          <PlayArrowRoundedIcon fontSize="small" />
        )}
      </IconButton>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 42, fontFeatureSettings: '"tnum"' }}
      >
        {durationLabel}
      </Typography>
      <Box
        ref={waveformContainerRef}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: `${WAVEFORM_BAR_GAP}px`,
          flex: 1,
          height: 22,
          mx: 0.5,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <Box
            sx={(theme) => ({
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${progressPercent}%`,
              right: 0,
              backgroundColor:
                theme.vars?.palette.level1 ?? theme.palette.background.paper,
              opacity: 0.5,
              transition: "left 140ms linear",
            })}
          />
        </Box>
        {waveformBars.map((value, index) => (
          <Box
            key={`wave-bar-${index}`}
            sx={(theme) => ({
              flex: "0 0 auto",
              width: `${computedBarWidth}px`,
              borderRadius: theme.spacing(0.25),
              backgroundColor: theme.vars?.palette.primary.main,
              height: `${Math.round(35 + value * 55)}%`,
              transition: "opacity 140ms ease",
            })}
          />
        ))}
      </Box>
      {actions}
    </Box>
  );
};
