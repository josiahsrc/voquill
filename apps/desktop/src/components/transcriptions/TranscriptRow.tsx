import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import {
  openTranscriptionDetailsDialog,
  retranscribeTranscription,
} from "../../actions/transcriptions.actions";
import { getTranscriptionRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { TypographyWithMore } from "../common/TypographyWithMore";
import { TranscriptionToneMenu } from "./TranscriptionToneMenu";

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

type PlaybackStopReason = "ended" | "stopped" | "replaced";

type ActiveWebAudioPlayback = {
  transcriptionId: string;
  context: AudioContext;
  source: AudioBufferSourceNode;
  rafId: number | null;
  startTime: number;
  durationSeconds: number;
  onStop: (reason: PlaybackStopReason) => void;
};

let activePlayback: ActiveWebAudioPlayback | null = null;

const stopActivePlayback = (reason: PlaybackStopReason): void => {
  const current = activePlayback;
  if (!current) {
    return;
  }

  activePlayback = null;

  if (current.rafId !== null) {
    window.cancelAnimationFrame(current.rafId);
  }

  try {
    current.source.onended = null;
  } catch {
    // no-op
  }

  try {
    current.source.stop();
  } catch {
    // no-op
  }

  current.context.close().catch(() => undefined);
  current.onStop(reason);
};

const playWebAudio = async (
  transcriptionId: string,
  data: { samples: number[]; sampleRate: number },
  onProgress: (progress: number) => void,
  onStop: (reason: PlaybackStopReason) => void,
): Promise<void> => {
  stopActivePlayback("replaced");

  const context = new AudioContext({ sampleRate: data.sampleRate });
  if (context.state === "suspended") {
    await context.resume();
  }

  const channelCount = 1;
  const floatSamples = Float32Array.from(data.samples ?? []);
  const buffer = context.createBuffer(
    channelCount,
    floatSamples.length,
    data.sampleRate,
  );
  buffer.getChannelData(0).set(floatSamples);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);

  const playback: ActiveWebAudioPlayback = {
    transcriptionId,
    context,
    source,
    rafId: null,
    startTime: context.currentTime,
    durationSeconds: buffer.duration,
    onStop,
  };
  activePlayback = playback;

  const tick = () => {
    if (activePlayback !== playback) {
      return;
    }

    const elapsed = playback.context.currentTime - playback.startTime;
    const ratio =
      playback.durationSeconds > 0
        ? Math.min(Math.max(elapsed / playback.durationSeconds, 0), 1)
        : 0;
    onProgress(ratio);

    if (ratio >= 1) {
      return;
    }

    playback.rafId = window.requestAnimationFrame(tick);
  };

  source.onended = () => {
    stopActivePlayback("ended");
  };

  onProgress(0);
  playback.startTime = context.currentTime;
  source.start();
  playback.rafId = window.requestAnimationFrame(tick);
};

const buildWaveformOutline = (
  seedKey: string,
  durationMs?: number | null,
  points = 28,
): number[] => {
  if (points <= 0) {
    return [];
  }

  const durationSeed = Math.round((durationMs ?? 0) / 37);
  const stringSeed = seedKey
    .split("")
    .reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
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
  const intl = useIntl();
  const transcription = useAppStore((state) =>
    getRec(state.transcriptionById, id),
  );

  const hasMetadata = useMemo(() => {
    const model = transcription?.modelSize?.trim();
    const device = transcription?.inferenceDevice?.trim();
    return Boolean(model || device);
  }, [transcription?.inferenceDevice, transcription?.modelSize]);

  const audioSnapshot = transcription?.audio;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [durationLabel, setDurationLabel] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const playbackNonceRef = useRef(0);
  const isPlayingRef = useRef(false);
  const transcriptionIdRef = useRef(id);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    transcriptionIdRef.current = id;
  }, [id]);
  const handleDetailsOpen = useCallback(() => {
    openTranscriptionDetailsDialog(id);
  }, [id]);

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
      audioSnapshot
        ? buildWaveformOutline(
            id,
            audioSnapshot.durationMs,
            desiredWaveformBarCount,
          )
        : [],
    [audioSnapshot?.durationMs, desiredWaveformBarCount, id],
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
    if (audioSnapshot) {
      setDurationLabel(formatDuration(audioSnapshot.durationMs));
    } else {
      setDurationLabel(null);
    }
  }, [audioSnapshot?.durationMs, audioSnapshot?.filePath]);

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
  }, [audioSnapshot?.filePath]);

  const handleCopyTranscript = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        showSnackbar(
          intl.formatMessage({ defaultMessage: "Copied successfully" }),
          { mode: "success" },
        );
      } catch (error) {
        showErrorSnackbar(error);
      }
    },
    [intl],
  );

  const handleDeleteTranscript = useCallback(
    async (id: string) => {
      try {
        produceAppState((draft) => {
          delete draft.transcriptionById[id];
          draft.transcriptions.transcriptionIds =
            draft.transcriptions.transcriptionIds.filter(
              (transcriptionId) => transcriptionId !== id,
            );
        });
        await getTranscriptionRepo().deleteTranscription(id);
        showSnackbar(
          intl.formatMessage({ defaultMessage: "Delete successful" }),
          { mode: "success" },
        );
      } catch (error) {
        showErrorSnackbar(error);
      }
    },
    [intl],
  );

  const handlePlaybackToggle = useCallback(async () => {
    if (!audioSnapshot) {
      return;
    }

    const currentNonce = playbackNonceRef.current + 1;
    playbackNonceRef.current = currentNonce;

    try {
      if (isPlayingRef.current) {
        stopActivePlayback("stopped");
        return;
      }

      const audioData = await getTranscriptionRepo().loadTranscriptionAudio(id);

      if (playbackNonceRef.current !== currentNonce) {
        return;
      }

      setIsPlaying(true);
      await playWebAudio(
        id,
        audioData,
        (progress) => {
          if (transcriptionIdRef.current === id) {
            setPlaybackProgress(progress);
          }
        },
        (reason) => {
          if (transcriptionIdRef.current !== id) {
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
  }, [audioSnapshot, id, intl]);

  const handleRetranscribe = useCallback(
    async (toneId: string | null) => {
      if (!audioSnapshot) {
        showErrorSnackbar(
          intl.formatMessage({
            defaultMessage:
              "Audio snapshot unavailable for this transcription.",
          }),
        );
        return;
      }

      try {
        if (activePlayback?.transcriptionId === id) {
          stopActivePlayback("stopped");
          setIsPlaying(false);
        }
        setPlaybackProgress(0);

        setIsRetranscribing(true);

        await retranscribeTranscription({ transcriptionId: id, toneId });
      } catch (error) {
        console.error("Failed to retranscribe audio", error);
        const fallbackMessage = intl.formatMessage({
          defaultMessage: "Unable to retranscribe audio snippet.",
        });
        const message =
          error instanceof Error ? error.message : fallbackMessage;
        showErrorSnackbar(message || fallbackMessage);
      } finally {
        setIsRetranscribing(false);
      }
    },
    [audioSnapshot, id, intl],
  );

  const handleExport = useCallback(async () => {
    try {
      const saved = await invoke<boolean>("export_transcription", { id });
      if (saved) {
        showSnackbar(
          intl.formatMessage({ defaultMessage: "Export saved successfully" }),
          { mode: "success" },
        );
      }
    } catch (error) {
      showErrorSnackbar(error);
    }
  }, [id, intl]);

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
          {dayjs(transcription?.createdAt).format("MMM D, YYYY h:mm A")}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip
            title={intl.formatMessage({
              defaultMessage: "View transcription details",
            })}
            placement="top"
          >
            <IconButton
              aria-label={intl.formatMessage({
                defaultMessage: "View transcription details",
              })}
              onClick={handleDetailsOpen}
              size="small"
              color={hasMetadata ? "primary" : "default"}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={intl.formatMessage({ defaultMessage: "Copy transcript" })}
            placement="top"
          >
            <IconButton
              aria-label={intl.formatMessage({
                defaultMessage: "Copy transcript",
              })}
              onClick={() =>
                handleCopyTranscript(transcription?.transcript || "")
              }
              size="small"
            >
              <ContentCopyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={intl.formatMessage({ defaultMessage: "Delete transcript" })}
            placement="top"
          >
            <IconButton
              aria-label={intl.formatMessage({
                defaultMessage: "Delete transcript",
              })}
              onClick={() => handleDeleteTranscript(id)}
              size="small"
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <TypographyWithMore
        variant="body2"
        color="text.primary"
        maxLines={3}
        sx={{ mt: 1 }}
      >
        {transcription?.transcript}
      </TypographyWithMore>
      {audioSnapshot && (
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
              aria-label={
                isPlaying
                  ? intl.formatMessage({ defaultMessage: "Pause audio" })
                  : intl.formatMessage({ defaultMessage: "Play audio" })
              }
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
            <TranscriptionToneMenu onToneSelect={handleRetranscribe}>
              {({ ref, open }) => (
                <Tooltip
                  title={intl.formatMessage({
                    defaultMessage: "Retranscribe audio clip",
                  })}
                  placement="top"
                >
                  <span ref={ref} style={{ display: "inline-flex" }}>
                    <IconButton
                      aria-label={intl.formatMessage({
                        defaultMessage: "Retranscribe audio",
                      })}
                      size="small"
                      onClick={open}
                      disabled={isRetranscribing}
                      sx={{ p: 0.5 }}
                    >
                      <ReplayRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </TranscriptionToneMenu>
            <Tooltip
              title={intl.formatMessage({
                defaultMessage: "Export transcription",
              })}
              placement="top"
            >
              <IconButton
                aria-label={intl.formatMessage({
                  defaultMessage: "Export transcription",
                })}
                size="small"
                onClick={handleExport}
                sx={{ p: 0.5 }}
              >
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
      <Divider sx={{ mt: 2 }} />
    </>
  );
};
