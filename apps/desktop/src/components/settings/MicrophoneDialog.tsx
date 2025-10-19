import { LoadingButton } from "@mui/lab";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { Nullable } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setPreferredMicrophone } from "../../actions/user.actions";
import { useMyUser } from "../../hooks/user.hooks";
import { produceAppState, useAppStore } from "../../store";
import { AudioWaveform } from "../common/AudioWaveform";
import { SettingSection } from "../common/SettingSection";

const AUTO_OPTION_VALUE = "__microphone_auto__";

type InputDeviceDescriptor = {
  label: string;
  isDefault: boolean;
  caution: boolean;
};

type DeviceOption = {
  value: string;
  label: string;
  isDefault: boolean;
  caution: boolean;
  unavailable?: boolean;
};

type StopRecordingResponse = {
  samples: number[] | Float32Array;
  sampleRate?: number;
};

const writeString = (view: DataView, offset: number, text: string) => {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
};

const floatTo16BitPCM = (
  view: DataView,
  offset: number,
  input: Float32Array
) => {
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset + index * 2, value, true);
  }
};

const buildWaveFile = (
  samples: Float32Array,
  sampleRate: number
): ArrayBuffer => {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  floatTo16BitPCM(view, 44, samples);
  return buffer;
};

const createPreviewUrl = (
  rawSamples: number[] | Float32Array,
  sampleRate: number
): string | null => {
  if (!sampleRate || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    return null;
  }

  const samples =
    rawSamples instanceof Float32Array
      ? rawSamples
      : Float32Array.from(rawSamples ?? []);

  if (!samples || samples.length === 0) {
    return null;
  }

  const wavBuffer = buildWaveFile(samples, sampleRate);
  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
};

export const MicrophoneDialog = () => {
  const open = useAppStore((state) => state.settings.microphoneDialogOpen);
  const overlayPhase = useAppStore((state) => state.overlayPhase);
  const audioLevels = useAppStore((state) => state.audioLevels);
  const user = useMyUser();

  const savedPreference = user?.preferredMicrophone ?? null;

  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Nullable<string>>(savedPreference);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [testState, setTestState] = useState<
    "idle" | "starting" | "recording" | "stopping"
  >("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const releasePreviewAudio = useCallback(() => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
  }, [setIsPreviewPlaying]);

  const clearPreviewUrl = useCallback(() => {
    releasePreviewAudio();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, [releasePreviewAudio]);

  const updatePreviewUrl = useCallback(
    (url: string | null) => {
      releasePreviewAudio();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = url;
      setPreviewUrl(url);
    },
    [releasePreviewAudio]
  );

  useEffect(() => () => clearPreviewUrl(), [clearPreviewUrl]);

  useEffect(() => {
    if (!previewUrl) {
      setIsPreviewPlaying(false);
      return;
    }

    const audio = new Audio(previewUrl);
    audio.preload = "auto";

    const handlePlay = () => setIsPreviewPlaying(true);
    const handlePause = () => setIsPreviewPlaying(false);
    const handleEnded = () => setIsPreviewPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    previewAudioRef.current = audio;

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      if (previewAudioRef.current === audio) {
        previewAudioRef.current = null;
      }
    };
  }, [previewUrl, setIsPreviewPlaying]);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    setDeviceError(null);
    try {
      const result = await invoke<InputDeviceDescriptor[]>("list_microphones");
      const mapped: DeviceOption[] = result.map((device) => ({
        value: device.label,
        label: device.label,
        isDefault: device.isDefault,
        caution: device.caution,
      }));
      setDevices(mapped);
    } catch (error) {
      console.error("Failed to load microphones", error);
      setDeviceError("Unable to fetch microphones. Please try again.");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadDevices();
  }, [open, loadDevices]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelected(savedPreference);
    setHasChanges(false);
    setSaveError(null);
    setSaveSuccess(false);
  }, [open, savedPreference]);

  const deviceOptions = useMemo(() => {
    const base = [...devices];
    if (selected && !base.some((device) => device.value === selected)) {
      base.push({
        value: selected,
        label: `${selected} (unavailable)`,
        isDefault: false,
        caution: true,
        unavailable: true,
      });
    }
    return base;
  }, [devices, selected]);

  const selectValue = selected ?? AUTO_OPTION_VALUE;

  const handleSelectChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      const normalized = value === AUTO_OPTION_VALUE ? null : value;
      setSelected(normalized);
      setHasChanges((normalized ?? null) !== (savedPreference ?? null));
      setSaveError(null);
      setSaveSuccess(false);
    },
    [savedPreference]
  );

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await setPreferredMicrophone(selected ?? null);
      setHasChanges(false);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError("Failed to save microphone preference. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [hasChanges, saving, selected]);

  const isGlobalRecording =
    overlayPhase === "recording" || overlayPhase === "loading";
  const isTestRunning = testState === "recording";
  const isTestLoading = testState === "starting";
  const isTestStopping = testState === "stopping";

  const handleStartTest = useCallback(async () => {
    if (isTestRunning || isTestLoading || isGlobalRecording) {
      return;
    }

    setTestError(null);
    clearPreviewUrl();
    setTestState("starting");

    try {
      await invoke<void>("start_recording", {
        args: { preferredMicrophone: selected ?? null },
      });
      setTestState("recording");
    } catch (error) {
      console.error("Failed to start microphone test", error);
      setTestError("Unable to start microphone test. Please try again.");
      setTestState("idle");
    }
  }, [
    clearPreviewUrl,
    isGlobalRecording,
    isTestLoading,
    isTestRunning,
    selected,
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
          const url = createPreviewUrl(samplesArray ?? [], rate);
          if (url) {
            updatePreviewUrl(url);
          } else {
            updatePreviewUrl(null);
            setTestError(
              "We didn't detect any audio. Try speaking while the test is running."
            );
          }
        } else {
          updatePreviewUrl(null);
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
    [testState, updatePreviewUrl]
  );

  const handleTogglePreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }

    if (isPreviewPlaying) {
      audio.pause();
      return;
    }

    if (
      audio.ended ||
      (audio.duration && audio.currentTime >= audio.duration)
    ) {
      audio.currentTime = 0;
    }

    audio
      .play()
      .then(() => {
        setTestError(null);
        setIsPreviewPlaying(true);
      })
      .catch((error) => {
        console.error("Failed to play recorded preview", error);
        setTestError("Unable to play the recorded preview.");
        setIsPreviewPlaying(false);
      });
  }, [isPreviewPlaying, setIsPreviewPlaying, setTestError]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      (testState === "recording" || testState === "starting") &&
      isGlobalRecording
    ) {
      void handleStopTest({ silent: true });
    }
  }, [handleStopTest, isGlobalRecording, open, testState]);

  useEffect(() => {
    if (!open) {
      if (testState !== "idle") {
        void handleStopTest({ silent: true });
      }
      clearPreviewUrl();
    }
  }, [clearPreviewUrl, handleStopTest, open, testState]);

  const handleClose = useCallback(() => {
    void handleStopTest({ silent: true });
    clearPreviewUrl();
    produceAppState((draft) => {
      draft.settings.microphoneDialogOpen = false;
    });
  }, [clearPreviewUrl, handleStopTest]);

  const disableStartButton =
    isGlobalRecording || isTestLoading || loadingDevices || saving;
  const disableStopButton = isTestStopping;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Microphone settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ paddingTop: 0.5 }}>
          <Stack spacing={1.5}>
            <SettingSection
              title="Preferred microphone"
              description="Choose which microphone Voquill should use when recording. Automatic picks the best available device each time."
              sx={{ pb: 0.5 }}
            />
            <FormControl fullWidth size="small" disabled={loadingDevices}>
              <InputLabel id="microphone-select-label">Microphone</InputLabel>
              <Select
                labelId="microphone-select-label"
                value={selectValue}
                label="Microphone"
                onChange={handleSelectChange}
              >
                <MenuItem value={AUTO_OPTION_VALUE}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                  >
                    <Typography>Automatic</Typography>
                    <Chip
                      size="small"
                      label="Recommended"
                      color="primary"
                      variant="filled"
                    />
                  </Stack>
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                {deviceOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Stack
                      direction="row"
                      spacing={2}
                      justifyContent="space-between"
                      width="100%"
                    >
                      <Box>
                        <Typography>{option.label}</Typography>
                        {option.unavailable ? (
                          <Typography variant="caption" color="warning.main">
                            Currently unavailable
                          </Typography>
                        ) : option.caution ? (
                          <Typography variant="caption" color="text.secondary">
                            May provide lower audio quality
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        {option.isDefault && (
                          <Chip
                            size="small"
                            label="Default"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {option.caution && !option.unavailable && (
                          <Chip
                            size="small"
                            label="Caution"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="text"
                onClick={loadDevices}
                size="small"
                disabled={loadingDevices}
              >
                Refresh devices
              </Button>
              {loadingDevices && <CircularProgress size={18} />}
            </Stack>
            {deviceError && <Alert severity="error">{deviceError}</Alert>}
            {saveError && <Alert severity="error">{saveError}</Alert>}
            {saveSuccess && <Alert severity="success">Preference saved.</Alert>}
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <SettingSection
              title="Test your microphone"
              description="Start a short test to see live audio levels and play back what was recorded."
            />
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: 96,
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
                sx={(theme) => ({
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: `linear-gradient(90deg, ${theme.vars?.palette.level0} 0%, transparent 18%, transparent 82%, ${theme.vars?.palette.level0} 100%)`,
                })}
              />
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <LoadingButton
                variant={isTestRunning ? "outlined" : "contained"}
                color={isTestRunning ? "error" : "primary"}
                onClick={
                  isTestRunning ? () => void handleStopTest() : handleStartTest
                }
                loading={isTestLoading || isTestStopping}
                disabled={
                  isTestRunning ? disableStopButton : disableStartButton
                }
              >
                {isTestRunning ? "Stop test" : "Start test"}
              </LoadingButton>
              <Button
                variant="outlined"
                disabled={previewUrl == null}
                onClick={handleTogglePreview}
              >
                {isPreviewPlaying ? "Pause preview" : "Play preview"}
              </Button>
            </Stack>
            {isGlobalRecording && (
              <Alert severity="info">
                You cannot start a microphone test while a transcription is in
                progress.
              </Alert>
            )}
            {testError && <Alert severity="warning">{testError}</Alert>}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <LoadingButton
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges || saving}
          variant="contained"
        >
          Save changes
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
