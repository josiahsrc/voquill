import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { OpenAICompatibleRepo } from "../../repos/ollama.repo";
import { normalizeOpenAICompatibleBaseUrl } from "../../utils/openai-compatible.utils";

type OpenAICompatibleModelPickerProps = {
  baseUrl: string | null;
  apiKey?: string | null;
  selectedModel: string | null;
  onModelSelect: (model: string | null) => void;
  disabled?: boolean;
};

export const OpenAICompatibleModelPicker = ({
  baseUrl,
  apiKey,
  selectedModel,
  onModelSelect,
  disabled = false,
}: OpenAICompatibleModelPickerProps) => {
  const [models, setModels] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);

  const effectiveUrl = useMemo(() => {
    return normalizeOpenAICompatibleBaseUrl(baseUrl);
  }, [baseUrl]);

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const repo = new OpenAICompatibleRepo(effectiveUrl, apiKey || undefined);
      const available = await repo.checkAvailability();
      setIsAvailable(available);

      if (available) {
        const fetchedModels = await repo.getAvailableModels();
        setModels(fetchedModels);
        setUseManualInput(false);
      } else {
        setModels([]);
        setUseManualInput(true);
      }
    } catch (error) {
      console.error("Failed to fetch OpenAI-compatible models", error);
      setIsAvailable(false);
      setModels([]);
      setUseManualInput(true);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUrl, apiKey]);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchModels();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchModels]);

  if (isLoading && isAvailable === null) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Checking OpenAI-compatible connection..." />
        </Typography>
      </Box>
    );
  }

  if (isAvailable === false && !useManualInput) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
        <ErrorOutlineIcon color="error" fontSize="small" />
        <Typography variant="body2" color="error">
          <FormattedMessage defaultMessage="Unable to connect to the OpenAI-compatible server at the specified URL." />
        </Typography>
      </Box>
    );
  }

  if (useManualInput) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="The server doesn't support model listing. Please enter the model name manually." />
        </Typography>
        <TextField
          label={<FormattedMessage defaultMessage="Model name" />}
          value={selectedModel ?? ""}
          onChange={(event) =>
            onModelSelect(
              event.target.value ? String(event.target.value) : null,
            )
          }
          placeholder="e.g., gpt-4o-mini"
          size="small"
          fullWidth
          disabled={disabled}
        />
      </Box>
    );
  }

  return (
    <Autocomplete
      freeSolo
      options={models}
      value={selectedModel ?? ""}
      onChange={(_event, newValue) => {
        onModelSelect(newValue || null);
      }}
      onInputChange={(_event, newInputValue, reason) => {
        if (reason === "input") {
          onModelSelect(newInputValue || null);
        }
      }}
      disabled={disabled || !isAvailable}
      size="small"
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          label={<FormattedMessage defaultMessage="Model" />}
          placeholder="Select or type a model"
          slotProps={{
            inputLabel: { ...params.InputLabelProps, shrink: true },
          }}
        />
      )}
    />
  );
};
