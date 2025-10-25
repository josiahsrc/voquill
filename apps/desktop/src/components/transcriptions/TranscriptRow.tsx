import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import {
  Box,
  Divider,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { getRec } from "@repo/utilities";
import { convertFileSrc } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import { getTranscriptionRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { TypographyWithMore } from "../common/TypographyWithMore";
import {
  transcribeAndPostProcessAudio,
  TranscriptionError,
  type TranscriptionMetadata,
} from "../../utils/transcription.utils";

export type TranscriptionRowProps = {
  id: string;
};

const formatDuration = (durationMs?: number | null): string => {
  if (!durationMs || !Number.isFinite(durationMs)) {
    return "0:00";
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatModelSizeLabel = (modelSize?: string | null): string => {
  const value = modelSize?.trim();
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const DEFAULT_WAVEFORM_BAR_COUNT = 58;
const MIN_WAVEFORM_BAR_VALUE = 0.05;
const MIN_COMPUTED_BAR_COUNT = 24;
const MAX_COMPUTED_BAR_COUNT = 120;
const WAVEFORM_BAR_MIN_WIDTH = 2;
const WAVEFORM_BAR_MAX_WIDTH = 4;
const WAVEFORM_BAR_GAP = 2;

const buildWaveformOutline = (
  seedKey: string,
  durationMs?: number | null,
  points = 28
): number[] => {
  if (points <= 0) {
    return [];
  }

  const durationSeed = Math.round((durationMs ?? 0) / 37);
  const stringSeed = seedKey
    .split("")
    .reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0
    );
  const combinedSeed = stringSeed * 31 + durationSeed * 17 || 1;
  const random = createSeededRandom(combinedSeed);

  return Array.from({ length: points }, (_, index) => {
    const t = points <= 1 ? 0 : index / (points - 1);
    const eased = Math.pow(t, 0.85);
    const envelope = Math.sin(Math.PI * eased);
    const modulation = 0.45 + random() * 0.55;
    const baseline = 0.12 + random() * 0.2;
    return Math.max(0.12, Math.min(1, envelope * modulation + baseline));
  });
};

export const TranscriptionRow = ({ id }: TranscriptionRowProps) => {
  const transcription = useAppStore((state) =>
    getRec(state.transcriptionById, id)
  );

  const hasMetadata = useMemo(() => {
    const model = transcription?.modelSize?.trim();
    const device = transcription?.inferenceDevice?.trim();
    return Boolean(model || device);
  }, [transcription?.inferenceDevice, transcription?.modelSize]);

  const modelSizeLabel = useMemo(
    () => formatModelSizeLabel(transcription?.modelSize ?? null),
    [transcription?.modelSize]
  );
  const deviceLabel = useMemo(() => {
    const value = transcription?.inferenceDevice?.trim();
    return value && value.length > 0 ? value : "Unknown";
  }, [transcription?.inferenceDevice]);

  const audioSnapshot = transcription?.audio;
  const audioSrc = useMemo(() => {
    if (!audioSnapshot) {
      return null;
    }

    try {
      return convertFileSrc(audioSnapshot.filePath);
    } catch (error) {
      console.error("Failed to resolve audio file path", error);
      return null;
    }
  }, [audioSnapshot?.filePath]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [durationLabel, setDurationLabel] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const [detailsAnchorEl, setDetailsAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isDetailsOpen = Boolean(detailsAnchorEl);

  const handleDetailsOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const { currentTarget } = event;
    setDetailsAnchorEl((previous) => (previous ? null : currentTarget));
  }, []);

  const handleDetailsClose = useCallback(() => {
    setDetailsAnchorEl(null);
  }, []);

  const desiredWaveformBarCount = useMemo(() => {
    if (waveformWidth <= 0) {
      return DEFAULT_WAVEFORM_BAR_COUNT;
    }

    const gap = WAVEFORM_BAR_GAP;
    const availableWidth = waveformWidth;
    const approximateCount = Math.floor(
      (availableWidth + gap) / (WAVEFORM_BAR_MIN_WIDTH + gap)
    );

    return Math.max(
      MIN_COMPUTED_BAR_COUNT,
      Math.min(MAX_COMPUTED_BAR_COUNT, approximateCount)
    );
  }, [waveformWidth]);

  const waveformValues = useMemo(
    () =>
      audioSnapshot
        ? buildWaveformOutline(
            id,
            audioSnapshot.durationMs,
            desiredWaveformBarCount
          )
        : [],
    [audioSnapshot?.durationMs, desiredWaveformBarCount, id]
  );

  const waveformBars = useMemo(() => {
    if (!waveformValues.length) {
      return Array.from(
        { length: desiredWaveformBarCount },
        () => MIN_WAVEFORM_BAR_VALUE
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
      Math.min(WAVEFORM_BAR_MAX_WIDTH, widthPerBar)
    );
  }, [waveformBars.length, waveformWidth]);
  const progressPercent = Math.min(Math.max(playbackProgress, 0), 1) * 100;

  useEffect(() => {
    if (audioSnapshot) {
      setDurationLabel(formatDuration(audioSnapshot.durationMs));
    } else {
      setDurationLabel(null);
    }
  }, [audioSnapshot?.durationMs, audioSnapshot?.filePath]);

  useEffect(() => {
    return () => {
      const element = audioRef.current;
      if (element) {
        element.pause();
        element.currentTime = 0;
      }
      setPlaybackProgress(0);
    };
  }, []);

  useEffect(() => {
    const element = audioRef.current;
    if (element) {
      element.pause();
      element.currentTime = 0;
      element.load();
      setIsPlaying(false);
    }
    setPlaybackProgress(0);
  }, [audioSrc]);

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
  }, [audioSrc]);

  const handleCopyTranscript = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showSnackbar("copied successful", { mode: "success" });
    } catch (error) {
      showErrorSnackbar(error);
    }
  }, []);

  const handleDeleteTranscript = useCallback(async (id: string) => {
    try {
      produceAppState((draft) => {
        delete draft.transcriptionById[id];
        draft.transcriptions.transcriptionIds =
          draft.transcriptions.transcriptionIds.filter(
            (transcriptionId) => transcriptionId !== id
          );
      });
      await getTranscriptionRepo().deleteTranscription(id);
      showSnackbar("Delete successful", { mode: "success" });
    } catch (error) {
      showErrorSnackbar(error);
    }
  }, []);

  const handlePlaybackToggle = useCallback(async () => {
    const element = audioRef.current;
    if (!element) {
      return;
    }

    try {
      if (element.paused) {
        setPlaybackProgress(0);
        await element.play();
      } else {
        element.pause();
        element.currentTime = 0;
        setPlaybackProgress(0);
      }
    } catch (error) {
      console.error("Failed to toggle audio playback", error);
      showErrorSnackbar("Unable to play audio snippet.");
    }
  }, []);

  const handleRetranscribe = useCallback(async () => {
    if (!audioSnapshot) {
      showErrorSnackbar("Audio snapshot unavailable for this transcription.");
      return;
    }

    if (!transcription) {
      showErrorSnackbar("Unable to load transcription details.");
      return;
    }

    try {
      const element = audioRef.current;
      if (element) {
        element.pause();
        element.currentTime = 0;
      }
      setPlaybackProgress(0);

      setIsRetranscribing(true);

      const repo = getTranscriptionRepo();
      const audioData = await repo.loadTranscriptionAudio(id);

      const {
        transcript: normalizedTranscript,
        warnings,
        metadata,
      } = await transcribeAndPostProcessAudio({
        samples: audioData.samples,
        sampleRate: audioData.sampleRate,
      });

      if (warnings.length > 0) {
        for (const warning of warnings) {
          showErrorSnackbar(warning);
        }
      }

      if (!normalizedTranscript) {
        showErrorSnackbar("Retranscription produced no text.");
        return;
      }

      const updatedPayload = {
        ...transcription,
        transcript: normalizedTranscript,
        modelSize: metadata?.modelSize ?? null,
        inferenceDevice: metadata?.inferenceDevice ?? null,
      };

      const updated = await repo.updateTranscription(updatedPayload);

      produceAppState((draft) => {
        draft.transcriptionById[id] = updated;
      });
    } catch (error) {
      console.error("Failed to retranscribe audio", error);
      const fallbackMessage = "Unable to retranscribe audio snippet.";
      const message =
        error instanceof TranscriptionError
          ? error.message
          : error instanceof Error
            ? error.message
            : fallbackMessage;
      showErrorSnackbar(message || fallbackMessage);
    } finally {
      setIsRetranscribing(false);
    }
  }, [audioSnapshot, id, transcription]);

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mt={1.5}
        spacing={1}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {dayjs(transcription?.createdAt.toDate()).format(
            "MMM D, YYYY h:mm A"
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="View transcription details" placement="top">
            <IconButton
              aria-label="View transcription details"
              onClick={handleDetailsOpen}
              size="small"
              color={hasMetadata ? "primary" : "default"}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy transcript" placement="top">
            <IconButton
              aria-label="Copy transcript"
              onClick={() =>
                handleCopyTranscript(transcription?.transcript || "")
              }
              size="small"
            >
              <ContentCopyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete transcript" placement="top">
            <IconButton
              aria-label="Delete transcript"
              onClick={() => handleDeleteTranscript(id)}
              size="small"
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Popover
        open={isDetailsOpen}
        anchorEl={detailsAnchorEl}
        onClose={handleDetailsClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { p: 2, maxWidth: 260 } }}
      >
        {hasMetadata ? (
          <Stack spacing={1.25}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Model
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {modelSizeLabel}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Device
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {deviceLabel}
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Metadata unavailable for this transcription.
          </Typography>
        )}
      </Popover>
      <TypographyWithMore
        variant="body2"
        color="text.primary"
        maxLines={3}
        sx={{ mt: 1 }}
      >
        {transcription?.transcript}
      </TypographyWithMore>
      {audioSnapshot && audioSrc && (
        <>
          <Box
            sx={{
              mt: 1.5,
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
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              size="small"
              onClick={handlePlaybackToggle}
              disabled={isRetranscribing}
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
              {durationLabel ?? formatDuration(audioSnapshot.durationMs)}
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
                      theme.vars?.palette.level1 ??
                      theme.palette.background.paper,
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
            <Tooltip title="Retranscribe audio clip" placement="top">
              <span style={{ display: "inline-flex" }}>
                <IconButton
                  aria-label="Retranscribe audio"
                  size="small"
                  onClick={handleRetranscribe}
                  disabled={isRetranscribing}
                  sx={{ p: 0.5 }}
                >
                  <ReplayRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <audio
            ref={audioRef}
            hidden
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              const element = audioRef.current;
              if (element && (element.paused || element.ended)) {
                const { duration } = element;
                if (Number.isFinite(duration) && duration > 0) {
                  setPlaybackProgress(element.currentTime / duration);
                }
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              const element = audioRef.current;
              if (element) {
                element.currentTime = 0;
              }
              setPlaybackProgress(0);
            }}
            onLoadedMetadata={() => {
              const element = audioRef.current;
              if (!element) {
                return;
              }
              if (Number.isFinite(element.duration) && element.duration > 0) {
                setDurationLabel(
                  formatDuration(Math.round(element.duration * 1000))
                );
              }
              setPlaybackProgress(0);
            }}
            onTimeUpdate={() => {
              const element = audioRef.current;
              if (!element) {
                return;
              }
              const { currentTime, duration } = element;
              if (!Number.isFinite(duration) || duration <= 0) {
                setPlaybackProgress(0);
                return;
              }
              setPlaybackProgress(
                Math.min(Math.max(currentTime / duration, 0), 1)
              );
            }}
          >
            <source src={audioSrc} type="audio/wav" />
          </audio>
        </>
      )}
      <Divider sx={{ mt: 2 }} />
    </>
  );
};
