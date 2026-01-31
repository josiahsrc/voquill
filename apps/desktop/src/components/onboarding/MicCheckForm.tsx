import { ArrowForward, Check } from "@mui/icons-material";
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  goToOnboardingPage,
  setOnboardingPreferredMicrophone,
} from "../../actions/onboarding.actions";
import { setAllModesToCloud } from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { trackButtonClick } from "../../utils/analytics.utils";
import { AudioWaveform } from "../common/AudioWaveform";
import { MicrophoneSelector } from "../microphone/MicrophoneSelector";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const MicCheckForm = () => {
  const theme = useTheme();
  const isEnterprise = useAppStore((state) => state.isEnterprise);

  const [recordingState, setRecordingState] = useState<
    "idle" | "starting" | "recording" | "stopping"
  >("idle");
  const [showMicSelector, setShowMicSelector] = useState(false);
  const preferredMicrophone = useAppStore(
    (state) => state.onboarding.preferredMicrophone,
  );

  const audioLevels = useAppStore((state) => state.audioLevels);
  const overlayPhase = useAppStore((state) => state.overlayPhase);
  const didSignUpWithAccount = useAppStore(
    (state) => state.onboarding.didSignUpWithAccount,
  );

  const isGlobalRecording =
    overlayPhase === "recording" || overlayPhase === "loading";
  const isRecording = recordingState === "recording";
  const isStarting = recordingState === "starting";

  const startRecording = useCallback(async () => {
    if (isGlobalRecording || recordingState !== "idle") {
      return;
    }

    setRecordingState("starting");

    try {
      await invoke<void>("start_recording", {
        args: { preferredMicrophone },
      });
      setRecordingState("recording");
    } catch (error) {
      console.error("Failed to start recording", error);
      setRecordingState("idle");
    }
  }, [isGlobalRecording, recordingState, preferredMicrophone]);

  const stopRecording = useCallback(async () => {
    if (recordingState !== "recording" && recordingState !== "starting") {
      return;
    }

    setRecordingState("stopping");

    try {
      await invoke("stop_recording");
    } catch (error) {
      console.error("Failed to stop recording", error);
    } finally {
      setRecordingState("idle");
      produceAppState((draft) => {
        draft.audioLevels = [];
      });
    }
  }, [recordingState]);

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    if (!showMicSelector) {
      void startRecording();
    }

    return () => {
      void stopRecordingRef.current();
    };
  }, [showMicSelector, preferredMicrophone]);

  useEffect(() => {
    if (isGlobalRecording && (isRecording || isStarting)) {
      void stopRecording();
    }
  }, [isGlobalRecording, isRecording, isStarting, stopRecording]);

  const handleChangeMicrophone = async () => {
    trackButtonClick("onboarding_try_another_mic");
    await stopRecording();
    setShowMicSelector(true);
  };

  const handleMicSelected = () => {
    trackButtonClick("onboarding_use_this_mic");
    setShowMicSelector(false);
  };

  const handleConfirm = async () => {
    trackButtonClick("onboarding_mic_looks_good");
    await stopRecording();
    if (didSignUpWithAccount) {
      if (isEnterprise) {
        await setAllModesToCloud();
        goToOnboardingPage("tutorial");
      } else {
        goToOnboardingPage("unlockedPro");
      }
    } else {
      goToOnboardingPage("tutorial");
    }
  };

  const form = (
    <OnboardingFormLayout back={<BackButton />} actions={<div />}>
      <Stack spacing={2} pb={8}>
        <Typography variant="h4" fontWeight={600}>
          <FormattedMessage defaultMessage="Test your microphone" />
        </Typography>
        <Typography variant="body1" color="text.secondary">
          <FormattedMessage defaultMessage="Say something and watch the waves respond to your voice." />
        </Typography>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Stack
      spacing={3}
      sx={{
        bgcolor: "level1",
        borderRadius: 2,
        p: 4,
        maxWidth: 400,
        width: "100%",
      }}
    >
      {showMicSelector ? (
        <>
          <Typography variant="h6" fontWeight={600}>
            <FormattedMessage defaultMessage="Choose a different microphone" />
          </Typography>
          <MicrophoneSelector
            value={preferredMicrophone}
            onChange={(value) => {
              setOnboardingPreferredMicrophone(value);
            }}
          />
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleMicSelected}
              endIcon={<Check />}
            >
              <FormattedMessage defaultMessage="Use this mic" />
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <Typography variant="h6" fontWeight={600}>
            <FormattedMessage defaultMessage="Do the waves respond to your voice?" />
          </Typography>

          <Box
            sx={{
              bgcolor: "level2",
              borderRadius: 2,
              p: 2,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: 80,
                display: "flex",
                alignItems: "center",
              }}
            >
              <AudioWaveform
                levels={audioLevels}
                active={isRecording}
                processing={isStarting}
                style={{ width: "100%", height: "100%" }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: -1,
                  right: -1,
                  pointerEvents: "none",
                  background: `linear-gradient(90deg, ${theme.vars?.palette.level2} 0%, transparent 18%, transparent 82%, ${theme.vars?.palette.level2} 100%)`,
                }}
              />
            </Box>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="text"
              onClick={() => void handleChangeMicrophone()}
            >
              <FormattedMessage defaultMessage="Try another mic" />
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleConfirm()}
              endIcon={<ArrowForward />}
            >
              <FormattedMessage defaultMessage="Looks good" />
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );

  return (
    <DualPaneLayout
      flex={[2, 3]}
      left={form}
      right={rightContent}
      rightSx={{ bgcolor: "transparent" }}
    />
  );
};
