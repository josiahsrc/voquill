import {
  FormControl,
  InputLabel,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import {
  setPreferredPostProcessingOllamaModel,
  setPreferredPostProcessingOllamaUrl,
  setPreferredPostProcessingApiKeyId,
  setPreferredPostProcessingMode,
} from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { type PostProcessingMode } from "../../types/ai.types";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";
import { VoquillCloudSetting } from "./VoquillCloudSetting";

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

  const handleModeChange = useCallback((mode: PostProcessingMode) => {
    void setPreferredPostProcessingMode(mode);
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredPostProcessingApiKeyId(id);
  }, []);

  const handleOllamaUrlChange = useCallback((value: string) => {
    void setPreferredPostProcessingOllamaUrl(value);
  }, []);

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
            placeholder="http://localhost:11434"
            value={postProcessing.ollamaUrl ?? ""}
            onChange={(event) => handleOllamaUrlChange(event.target.value)}
            fullWidth
            size="small"
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
            >
              {/* Model options will be added later */}
            </Select>
          </FormControl>
        </Stack>
      )}
    </Stack>
  );
};
