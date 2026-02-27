import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
    <FormControl fullWidth size="small">
      <InputLabel id="openai-compatible-model-label" shrink>
        <FormattedMessage defaultMessage="Model" />
      </InputLabel>
      <Select
        labelId="openai-compatible-model-label"
        label={<FormattedMessage defaultMessage="Model" />}
        value={selectedModel ?? ""}
        onChange={(event) =>
          onModelSelect(event.target.value ? String(event.target.value) : null)
        }
        displayEmpty
        notched
        disabled={disabled || !isAvailable}
      >
        <MenuItem value="">
          <em>
            <FormattedMessage defaultMessage="Select a model" />
          </em>
        </MenuItem>
        {models.map((model) => (
          <MenuItem key={model} value={model}>
            {model}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
