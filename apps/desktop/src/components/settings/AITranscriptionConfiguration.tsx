import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import {
  setPreferredTranscriptionApiKeyId,
  setPreferredTranscriptionDevice,
  setPreferredTranscriptionMode,
  setPreferredTranscriptionModelSize,
} from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { CPU_DEVICE_VALUE, type TranscriptionMode } from "../../types/ai.types";
import { getAllowsChangeTranscription } from "../../utils/enterprise.utils";
import {
  isGpuPreferredTranscriptionDevice,
  normalizeLocalWhisperModel,
} from "../../utils/local-transcription.utils";
import { ManagedByOrgNotice } from "../common/ManagedByOrgNotice";
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
    value: "medium",
    label: "Medium (1.53 GB)",
    helper: "Balanced quality and speed",
  },
  {
    value: "turbo",
    label: "Turbo (1.6 GB)",
    helper: "Fast large model, great accuracy",
  },
  {
    value: "large",
    label: "Large (3.1 GB)",
    helper: "Highest accuracy, requires GPU",
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
  const deviceValue = isGpuPreferredTranscriptionDevice(transcription.device)
    ? "gpu"
    : CPU_DEVICE_VALUE;
  const modelValue = normalizeLocalWhisperModel(transcription.modelSize);

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
          <FormControl fullWidth size="small">
            <InputLabel id="processing-device-label">
              <FormattedMessage defaultMessage="Processing device" />
            </InputLabel>
            <Select
              labelId="processing-device-label"
              label={<FormattedMessage defaultMessage="Processing device" />}
              value={deviceValue}
              onChange={(event) => handleDeviceChange(event.target.value)}
            >
              <MenuItem value={CPU_DEVICE_VALUE}>
                <FormattedMessage defaultMessage="CPU processing" />
              </MenuItem>
              <MenuItem value="gpu">
                <FormattedMessage defaultMessage="GPU acceleration (auto fallback)" />
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="model-size-label">
              <FormattedMessage defaultMessage="Model size" />
            </InputLabel>
            <Select
              labelId="model-size-label"
              label={<FormattedMessage defaultMessage="Model size" />}
              value={modelValue}
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
