import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { Divider, IconButton, Stack, Typography } from "@mui/material";
import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getTranscriptionRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { TypographyWithMore } from "../common/TypographyWithMore";

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

export const TranscriptionRow = ({ id }: TranscriptionRowProps) => {
  const transcription = useAppStore((state) =>
    getRec(state.transcriptionById, id)
  );

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
  }, [audioSrc]);

  const handleCopyTranscript = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
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
        await element.play();
      } else {
        element.pause();
        element.currentTime = 0;
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

      setIsRetranscribing(true);

      const repo = getTranscriptionRepo();
      const audioData = await repo.loadTranscriptionAudio(id);

      const transcriptText = await invoke<string>("transcribe_audio", {
        samples: audioData.samples,
        sampleRate: audioData.sampleRate,
      });

      const normalizedTranscript = transcriptText.trim();
      if (!normalizedTranscript) {
        showErrorSnackbar("Retranscription produced no text.");
        return;
      }

      const updated = await repo.updateTranscription({
        ...transcription,
        transcript: normalizedTranscript,
      });

      produceAppState((draft) => {
        draft.transcriptionById[id] = updated;
      });
    } catch (error) {
      console.error("Failed to retranscribe audio", error);
      showErrorSnackbar("Unable to retranscribe audio snippet.");
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
          <IconButton
            aria-label="Copy transcript"
            onClick={() =>
              handleCopyTranscript(transcription?.transcript || "")
            }
            size="small"
          >
            <ContentCopyRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="Delete transcript"
            onClick={() => handleDeleteTranscript(id)}
            size="small"
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      {audioSnapshot && audioSrc && (
        <>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mt: 1 }}
          >
            <IconButton
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              size="small"
              onClick={handlePlaybackToggle}
              disabled={isRetranscribing}
            >
              {isPlaying ? (
                <PauseRoundedIcon fontSize="small" />
              ) : (
                <PlayArrowRoundedIcon fontSize="small" />
              )}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {durationLabel ?? formatDuration(audioSnapshot.durationMs)}
            </Typography>
            <IconButton
              aria-label="Retranscribe audio"
              size="small"
              onClick={handleRetranscribe}
              disabled={isRetranscribing}
            >
              <ReplayRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
          <audio
            ref={audioRef}
            hidden
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              const element = audioRef.current;
              if (element) {
                element.currentTime = 0;
              }
            }}
            onLoadedMetadata={() => {
              const element = audioRef.current;
              if (!element) {
                return;
              }
              if (Number.isFinite(element.duration) && element.duration > 0) {
                setDurationLabel(formatDuration(Math.round(element.duration * 1000)));
              }
            }}
          >
            <source src={audioSrc} type="audio/wav" />
          </audio>
        </>
      )}
      <TypographyWithMore
        variant="body2"
        color="text.primary"
        maxLines={3}
        sx={{ mt: 1 }}
      >
        {transcription?.transcript}
      </TypographyWithMore>
      <Divider sx={{ mt: 2 }} />
    </>
  );
};
