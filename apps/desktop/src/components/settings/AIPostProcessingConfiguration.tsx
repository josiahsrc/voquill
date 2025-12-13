import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import {
  setPreferredPostProcessingOllamaModel,
  setPreferredPostProcessingOllamaUrl,
  setPreferredPostProcessingApiKeyId,
  setPreferredPostProcessingMode,
} from "../../actions/user.actions";
import { refreshOllamaPostProcessingState } from "../../actions/settings.actions";
import { useAppStore } from "../../store";
import { type PostProcessingMode } from "../../types/ai.types";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";
import { VoquillCloudSetting } from "./VoquillCloudSetting";
import { OLLAMA_DEFAULT_URL } from "../../utils/ollama.utils";
import { useIntervalAsync } from "../../hooks/helper.hooks";

type AIPostProcessingConfigurationProps = {
  hideCloudOption?: boolean;
};

export function maybeArrayElements<T>(visible: boolean, values: T[]): T[] {
  return visible ? values : [];
}

export const AIPostProcessingConfiguration = ({
  hideCloudOption,
}: AIPostProcessingConfigurationProps) => {
  const postProcessing = useAppStore(
    (state) => state.settings.aiPostProcessing,
  );

  const shouldPollOllama = postProcessing.mode === "ollama";

  const refreshOllamaState = async () => {
    if (shouldPollOllama) {
      await refreshOllamaPostProcessingState();
    }
  };

  useEffect(() => {
    void refreshOllamaState();
  }, []);

  useIntervalAsync(
    3000,
    async () => {
      await refreshOllamaState();
    },
    [],
  );

  const handleModeChange = useCallback((mode: PostProcessingMode) => {
    void setPreferredPostProcessingMode(mode);
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredPostProcessingApiKeyId(id);
  }, []);

  const handleOllamaUrlChange = useCallback((value: string) => {
    void setPreferredPostProcessingOllamaUrl(value);
  }, []);

  const handleOllamaUrlBlur = useCallback(() => {
    void refreshOllamaState();
  }, [shouldPollOllama, refreshOllamaState]);

  const handleOllamaModelChange = useCallback((value: string | null) => {
    void setPreferredPostProcessingOllamaModel(value);
  }, []);

  return (
    <Stack spacing={3} alignItems="flex-start" sx={{ width: "100%" }}>
      <SegmentedControl<PostProcessingMode>
        value={postProcessing.mode}
        onChange={handleModeChange}
        options={[
          ...maybeArrayElements<SegmentedControlOption<PostProcessingMode>>(
            !hideCloudOption,
            [
              {
                value: "cloud",
                label: "Voquill Cloud",
              },
            ],
          ),
          { value: "none", label: "Disabled" },
          { value: "api", label: "API key" },
          { value: "ollama", label: "Ollama" },
        ]}
        ariaLabel="Post-processing mode"
      />

      {postProcessing.mode === "none" && (
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="No AI post-processing will run on new transcripts." />
        </Typography>
      )}

      {postProcessing.mode === "api" && (
        <ApiKeyList
          selectedApiKeyId={postProcessing.selectedApiKeyId}
          onChange={handleApiKeyChange}
          context="post-processing"
        />
      )}

      {postProcessing.mode === "cloud" && <VoquillCloudSetting />}

      {postProcessing.mode === "ollama" && (
        <Stack spacing={2} sx={{ width: "100%" }}>
          <TextField
            label={<FormattedMessage defaultMessage="Ollama host URL" />}
            placeholder={OLLAMA_DEFAULT_URL}
            value={postProcessing.ollamaUrl ?? ""}
            onChange={(event) => handleOllamaUrlChange(event.target.value)}
            onBlur={handleOllamaUrlBlur}
            fullWidth
            size="small"
            error={!postProcessing.isOllamaAvailable}
            helperText={
              !postProcessing.isOllamaAvailable ? (
                <FormattedMessage defaultMessage="Unable to connect to Ollama at the specified URL." />
              ) : undefined
            }
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="ollama-model-label" shrink>
              <FormattedMessage defaultMessage="Model" />
            </InputLabel>
            <Select
              labelId="ollama-model-label"
              label={<FormattedMessage defaultMessage="Model" />}
              value={postProcessing.ollamaModel ?? ""}
              onChange={(event) =>
                handleOllamaModelChange(
                  event.target.value ? String(event.target.value) : null,
                )
              }
              displayEmpty
              notched
              disabled={!postProcessing.isOllamaAvailable}
            >
              <MenuItem value="">
                <em>
                  <FormattedMessage defaultMessage="Select a model" />
                </em>
              </MenuItem>
              {postProcessing.ollamaModels.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}
    </Stack>
  );
};
