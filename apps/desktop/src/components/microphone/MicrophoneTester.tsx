import { LoadingButton } from "@mui/lab";
import { Alert, Box, Button, Stack, useTheme } from "@mui/material";
import { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import {
  activePlayback,
  pauseActivePlayback,
  playManagedAudio,
  resumeActivePlayback,
  stopActivePlayback,
  type PlaybackAudioData,
} from "../../utils/audio-playback.utils";
import { AudioWaveform } from "../common/AudioWaveform";

type StopRecordingResponse = {
  samples: number[] | Float32Array;
  sampleRate?: number;
};

const PREVIEW_PLAYBACK_ID = "microphone-tester-preview";

export type MicrophoneTesterProps = {
  preferredMicrophone: Nullable<string>;
  waveformHeight?: number;
  disabled?: boolean;
  buttonLayout?: "row" | "column";
  fadeColor?: string;
  justifyButtons?: "flex-start" | "center" | "flex-end" | "space-between";
};

export const MicrophoneTester = ({
  preferredMicrophone,
  waveformHeight = 96,
  disabled = false,
  buttonLayout = "row",
  fadeColor = "level0",
  justifyButtons = "flex-start",
}: MicrophoneTesterProps) => {
  const overlayPhase = useAppStore((state) => state.overlayPhase);
  const audioLevels = useAppStore((state) => state.audioLevels);
  const theme = useTheme();
  const effectiveFadeColor =
    fadeColor === "level0"
      ? theme.vars?.palette.level0
      : theme.vars?.palette?.level1;

  const [testState, setTestState] = useState<
    "idle" | "starting" | "recording" | "stopping"
  >("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<PlaybackAudioData | null>(
    null,
  );
  const [previewPlaybackStatus, setPreviewPlaybackStatus] = useState<
    "idle" | "playing" | "paused"
  >("idle");

  const isGlobalRecording =
    overlayPhase === "recording" || overlayPhase === "loading";
  const isTestRunning = testState === "recording";
  const isTestLoading = testState === "starting";
  const isTestStopping = testState === "stopping";
  const isPreviewPlaying = previewPlaybackStatus === "playing";

  const clearPreviewAudio = useCallback(() => {
    if (activePlayback?.id === PREVIEW_PLAYBACK_ID) {
      void stopActivePlayback("stopped");
    }
    setPreviewPlaybackStatus("idle");
    setPreviewAudio(null);
  }, []);

  useEffect(() => () => clearPreviewAudio(), [clearPreviewAudio]);

  const handleStartTest = useCallback(async () => {
    if (isTestRunning || isTestLoading || isGlobalRecording || disabled) {
      return;
    }

    setTestError(null);
    clearPreviewAudio();
    setTestState("starting");

    try {
      await invoke<void>("start_recording", {
        args: { preferredMicrophone: preferredMicrophone ?? null },
      });
      setTestState("recording");
    } catch (error) {
      console.error("Failed to start microphone test", error);
      setTestError("Unable to start microphone test. Please try again.");
      setTestState("idle");
    }
  }, [
    clearPreviewAudio,
    disabled,
    isGlobalRecording,
    isTestLoading,
    isTestRunning,
    preferredMicrophone,
  ]);

  const handleStopTest = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (testState !== "recording" && testState !== "starting") {
        return;
      }

      setTestState("stopping");

      try {
        const response = await invoke<StopRecordingResponse>("stop_recording");
        const rate = response.sampleRate ?? 0;
        const samplesArray =
          response.samples instanceof Float32Array
            ? Array.from(response.samples)
            : response.samples;

        if (!opts?.silent) {
          if ((samplesArray?.length ?? 0) > 0 && rate > 0) {
            setPreviewAudio({
              samples: samplesArray ?? [],
              sampleRate: rate,
            });
            setPreviewPlaybackStatus("idle");
          } else {
            setPreviewAudio(null);
            setPreviewPlaybackStatus("idle");
            setTestError(
              "We didn't detect any audio. Try speaking while the test is running.",
            );
          }
        } else {
          setPreviewAudio(null);
          setPreviewPlaybackStatus("idle");
        }
      } catch (error) {
        console.error("Failed to stop microphone test", error);
        if (!opts?.silent) {
          setTestError("Unable to stop microphone test. Please try again.");
        }
      } finally {
        setTestState("idle");
        produceAppState((draft) => {
          draft.audioLevels = [];
        });
      }
    },
    [testState],
  );

  const handleTogglePreview = useCallback(async () => {
    if (!previewAudio) {
      return;
    }

    try {
      if (activePlayback?.id === PREVIEW_PLAYBACK_ID) {
        if (activePlayback.pausedAtMs === null) {
          const paused = await pauseActivePlayback(PREVIEW_PLAYBACK_ID);
          if (paused) {
            setPreviewPlaybackStatus("paused");
          }
          return;
        }

        const resumed = await resumeActivePlayback(PREVIEW_PLAYBACK_ID);
        if (resumed) {
          setPreviewPlaybackStatus("playing");
          setTestError(null);
        }
        return;
      }

      setPreviewPlaybackStatus("playing");
      await playManagedAudio(
        PREVIEW_PLAYBACK_ID,
        previewAudio,
        () => undefined,
        () => {
          setPreviewPlaybackStatus("idle");
        },
      );
      setPreviewPlaybackStatus("playing");
      setTestError(null);
    } catch (error) {
      console.error("Failed to play recorded preview", error);
      setTestError("Unable to play the recorded preview.");
      setPreviewPlaybackStatus("idle");
    }
  }, [previewAudio]);

  useEffect(() => {
    if (
      (testState === "recording" || testState === "starting") &&
      isGlobalRecording
    ) {
      void handleStopTest({ silent: true });
    }
  }, [handleStopTest, isGlobalRecording, testState]);

  const handleStopTestRef = useRef(handleStopTest);
  useEffect(() => {
    handleStopTestRef.current = handleStopTest;
  }, [handleStopTest]);

  useEffect(() => {
    return () => {
      void handleStopTestRef.current({ silent: true });
      clearPreviewAudio();
    };
  }, [clearPreviewAudio]);

  const disableStartButton =
    disabled || isGlobalRecording || isTestLoading || isTestRunning;
  const disableStopButton = disabled || isTestStopping;

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: waveformHeight,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <AudioWaveform
          levels={audioLevels}
          active={isTestRunning}
          processing={isTestLoading || isTestStopping}
          style={{ width: "100%", height: "100%" }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(90deg, ${effectiveFadeColor} 0%, transparent 18%, transparent 82%, ${effectiveFadeColor} 100%)`,
          }}
        />
      </Box>

      <Stack
        direction={buttonLayout}
        spacing={1.5}
        alignItems={buttonLayout === "row" ? "center" : "stretch"}
        width="100%"
        justifyContent={justifyButtons}
      >
        <LoadingButton
          variant={isTestRunning ? "outlined" : "contained"}
          color={isTestRunning ? "error" : "primary"}
          onClick={
            isTestRunning ? () => void handleStopTest() : handleStartTest
          }
          loading={isTestLoading || isTestStopping}
          disabled={isTestRunning ? disableStopButton : disableStartButton}
          fullWidth={buttonLayout === "column"}
        >
          {isTestRunning ? (
            <FormattedMessage defaultMessage="Finish" />
          ) : (
            <FormattedMessage defaultMessage="Record" />
          )}
        </LoadingButton>
        <Button
          variant="outlined"
          disabled={previewAudio == null || disabled}
          onClick={() => void handleTogglePreview()}
          fullWidth={buttonLayout === "column"}
        >
          {isPreviewPlaying ? (
            <FormattedMessage defaultMessage="Pause" />
          ) : (
            <FormattedMessage defaultMessage="Play" />
          )}
        </Button>
      </Stack>

      {isGlobalRecording && (
        <Alert severity="info">
          <FormattedMessage defaultMessage="You cannot start a microphone test while a transcription is in progress." />
        </Alert>
      )}

      {testError && (
        <Alert severity="warning" onClose={() => setTestError(null)}>
          {testError}
        </Alert>
      )}
    </Stack>
  );
};
