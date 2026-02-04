import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  setGpuEnumerationEnabled,
  setPreferredTranscriptionApiKeyId,
  setPreferredTranscriptionDevice,
  setPreferredTranscriptionMode,
  setPreferredTranscriptionModelSize,
} from "../../actions/user.actions";
import { useSupportedDiscreteGpus } from "../../hooks/gpu.hooks";
import { useAppStore } from "../../store";
import { getAllowsChangeTranscription } from "../../utils/enterprise.utils";
import { ManagedByOrgNotice } from "../common/ManagedByOrgNotice";
import { CPU_DEVICE_VALUE, type TranscriptionMode } from "../../types/ai.types";
import { buildDeviceLabel, type GpuInfo } from "../../types/gpu.types";
import { isGPUBuild } from "../../utils/env.utils";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../common/SegmentedControl";
import { maybeArrayElements } from "./AIPostProcessingConfiguration";
import { ApiKeyList } from "./ApiKeyList";
import { VoquillCloudSetting } from "./VoquillCloudSetting";

type ModelOption = {
  value: string;
  label: string;
  helper: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  { value: "tiny", label: "Tiny (77 MB)", helper: "Fastest, lowest accuracy" },
  {
    value: "base",
    label: "Base (148 MB)",
    helper: "Great balance of speed and accuracy",
  },
  {
    value: "small",
    label: "Small (488 MB)",
    helper: "Recommended with GPU acceleration",
  },
  {
    value: "medium",
    label: "Medium (1.53 GB)",
    helper: "Highest accuracy, slower on CPU",
  },
];

export type AITranscriptionConfigurationProps = {
  hideCloudOption?: boolean;
};

export const AITranscriptionConfiguration = ({
  hideCloudOption,
}: AITranscriptionConfigurationProps) => {
  const transcription = useAppStore((state) => state.settings.aiTranscription);
  const allowChange = useAppStore(getAllowsChangeTranscription);
  const [gpuEnumerationError, setGpuEnumerationError] = useState<string | null>(
    null,
  );
  const [isEnablingGpu, setIsEnablingGpu] = useState(false);

  // Only load GPUs if already enabled (persisted state)
  const { gpus, loading: gpusLoading } = useSupportedDiscreteGpus(
    transcription.gpuEnumerationEnabled,
  );

  // Single click handler - does everything in one place
  const handleEnableHardwareAcceleration = useCallback(async () => {
    setGpuEnumerationError(null);
    setIsEnablingGpu(true);

    try {
      // Fetch GPUs directly here, don't rely on hook state
      const gpuList = await invoke<GpuInfo[]>("list_gpus");
      const supported = gpuList.filter(
        (info) =>
          info.backend === "Vulkan" && info.deviceType === "DiscreteGpu",
      );

      console.log("[gpu] Detected supported GPUs:", supported);

      if (supported.length > 0) {
        // Success - enable GPU enumeration (this will trigger hook to load GPUs for dropdown)
        await setGpuEnumerationEnabled(true);
        console.log("GPUs enabled for transcription processing.");
      } else {
        setGpuEnumerationError(
          "No compatible GPUs found. Make sure you have a discrete GPU with Vulkan support.",
        );
      }
    } catch (error) {
      console.error("Failed to enumerate GPUs:", error);
      setGpuEnumerationError("Failed to detect GPUs. Please try again.");
    } finally {
      setIsEnablingGpu(false);
    }
  }, []);

  const deviceOptions = useMemo(
    () => [
      { value: CPU_DEVICE_VALUE, label: "CPU processing" },
      ...gpus.map((gpu, index) => ({
        value: `gpu-${index}`,
        label: buildDeviceLabel(gpu),
      })),
    ],
    [gpus],
  );

  const handleModeChange = useCallback((mode: TranscriptionMode) => {
    void setPreferredTranscriptionMode(mode);
  }, []);

  const handleDeviceChange = useCallback((device: string) => {
    void setPreferredTranscriptionDevice(device);
  }, []);

  const handleModelSizeChange = useCallback((modelSize: string) => {
    void setPreferredTranscriptionModelSize(modelSize);
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredTranscriptionApiKeyId(id);
  }, []);

  if (!allowChange) {
    return <ManagedByOrgNotice />;
  }

  return (
    <Stack spacing={3} alignItems="flex-start" sx={{ width: "100%" }}>
      <SegmentedControl<TranscriptionMode>
        value={transcription.mode}
        onChange={handleModeChange}
        options={[
          ...maybeArrayElements<SegmentedControlOption<TranscriptionMode>>(
            !hideCloudOption,
            [
              {
                value: "cloud",
                label: "Voquill",
              },
            ],
          ),
          { value: "api", label: "API" },
          { value: "local", label: "Local" },
        ]}
        ariaLabel="Processing mode"
      />

      {transcription.mode === "local" && (
        <Stack spacing={3} sx={{ width: "100%" }}>
          {!transcription.gpuEnumerationEnabled && isGPUBuild() && (
            <Alert
              severity="info"
              sx={{
                width: "100%",
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 2,
                  width: "100%",
                }}
              >
                <Typography variant="body2" sx={{ pt: 0.25 }}>
                  <FormattedMessage defaultMessage="Have an NVIDIA GPU?" />
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={isEnablingGpu}
                  onClick={handleEnableHardwareAcceleration}
                  sx={{ fontSize: "0.75rem", py: 0.5, flexShrink: 0 }}
                >
                  {isEnablingGpu ? (
                    <FormattedMessage defaultMessage="Detecting..." />
                  ) : (
                    <FormattedMessage defaultMessage="Enable hardware acceleration" />
                  )}
                </Button>
              </Box>
            </Alert>
          )}

          {gpuEnumerationError && (
            <Alert severity="warning">{gpuEnumerationError}</Alert>
          )}

          {transcription.gpuEnumerationEnabled && (
            <FormControl fullWidth size="small">
              <InputLabel id="processing-device-label">
                <FormattedMessage defaultMessage="Processing device" />
              </InputLabel>
              <Select
                labelId="processing-device-label"
                label={<FormattedMessage defaultMessage="Processing device" />}
                value={transcription.device}
                onChange={(event) => handleDeviceChange(event.target.value)}
                disabled={gpusLoading}
              >
                {deviceOptions.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth size="small">
            <InputLabel id="model-size-label">
              <FormattedMessage defaultMessage="Model size" />
            </InputLabel>
            <Select
              labelId="model-size-label"
              label={<FormattedMessage defaultMessage="Model size" />}
              value={transcription.modelSize}
              onChange={(event) => handleModelSizeChange(event.target.value)}
            >
              {MODEL_OPTIONS.map(({ value, label, helper }) => (
                <MenuItem key={value} value={value}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {label}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {helper}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      {transcription.mode === "api" && (
        <ApiKeyList
          selectedApiKeyId={transcription.selectedApiKeyId}
          onChange={handleApiKeyChange}
          context="transcription"
        />
      )}

      {transcription.mode === "cloud" && <VoquillCloudSetting />}
    </Stack>
  );
};
