import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import { produceAppState, useAppStore } from "../../store";
import {
  CPU_DEVICE_VALUE,
  type ProcessingMode,
} from "../../types/ai.types";
import { buildDeviceLabel } from "../../types/gpu.types";
import { useSupportedDiscreteGpus } from "../../hooks/gpu.hooks";
import { SegmentedControl } from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";
import {
  setPreferredTranscriptionApiKeyId,
  setPreferredTranscriptionMode,
} from "../../actions/user.actions";
import { getIsPaying } from "../../utils/member.utils";

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

export const AITranscriptionConfiguration = () => {
  const transcription = useAppStore(
    (state) => state.settings.aiTranscription
  );
  const isPro = useAppStore(getIsPaying);
  const { gpus, loading: gpusLoading } = useSupportedDiscreteGpus(true);

  useEffect(() => {
    if (gpusLoading) {
      return;
    }

    if (gpus.length === 0) {
      if (transcription.device !== CPU_DEVICE_VALUE) {
        produceAppState((draft) => {
          draft.settings.aiTranscription.device = CPU_DEVICE_VALUE;
        });
      }
      return;
    }

    if (transcription.device.startsWith("gpu-")) {
      const index = Number.parseInt(
        transcription.device.split("-")[1] ?? "",
        10
      );
      if (Number.isNaN(index) || index >= gpus.length) {
        produceAppState((draft) => {
          draft.settings.aiTranscription.device = CPU_DEVICE_VALUE;
        });
      }
    }
  }, [gpus, gpusLoading, transcription.device]);

  useEffect(() => {
    if (!isPro && transcription.mode === "cloud") {
      produceAppState((draft) => {
        draft.settings.aiTranscription.mode = "local";
      });
    }
  }, [isPro, transcription.mode]);

  const deviceOptions = useMemo(
    () => [
      { value: CPU_DEVICE_VALUE, label: "CPU processing" },
      ...gpus.map((gpu, index) => ({
        value: `gpu-${index}`,
        label: buildDeviceLabel(gpu),
      })),
    ],
    [gpus]
  );

  const handleModeChange = useCallback((mode: ProcessingMode) => {
    void setPreferredTranscriptionMode(mode);
  }, []);

  const handleDeviceChange = useCallback((device: string) => {
    produceAppState((draft) => {
      draft.settings.aiTranscription.device = device;
    });
  }, []);

  const handleModelSizeChange = useCallback((modelSize: string) => {
    produceAppState((draft) => {
      draft.settings.aiTranscription.modelSize = modelSize;
    });
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredTranscriptionApiKeyId(id);
  }, []);

  return (
    <Stack spacing={3} alignItems="flex-start" sx={{ width: "100%" }}>
      <SegmentedControl<ProcessingMode>
        value={transcription.mode}
        onChange={handleModeChange}
        options={[
          { value: "cloud", label: "Voquill Cloud", disabled: !isPro },
          { value: "local", label: "Local processing" },
          { value: "api", label: "API key" },
        ]}
        ariaLabel="Processing mode"
      />

      {transcription.mode === "local" && (
        <Stack spacing={3} sx={{ width: "100%" }}>
          <FormControl fullWidth size="small">
            <InputLabel id="processing-device-label">
              Processing device
            </InputLabel>
            <Select
              labelId="processing-device-label"
              label="Processing device"
              value={transcription.device}
              onChange={(event) => handleDeviceChange(event.target.value)}
            >
              {deviceOptions.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="model-size-label">Model size</InputLabel>
            <Select
              labelId="model-size-label"
              label="Model size"
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
        />
      )}

      {transcription.mode === "cloud" && (
        <Stack spacing={1.5} sx={{ width: "100%" }}>
          <Typography variant="body1">
            Voquill Cloud handles transcription for you—no downloads, no manual
            setup.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record on any device and we&apos;ll keep your data secure, synced,
            and ready everywhere.
          </Typography>
        </Stack>
      )}
    </Stack>
  );
};
