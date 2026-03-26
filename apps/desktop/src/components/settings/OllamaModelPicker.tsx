import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { OllamaRepo, OpenAICompatibleRepo } from "../../repos/ollama.repo";
import { OLLAMA_DEFAULT_URL } from "../../utils/ollama.utils";

type OllamaModelPickerProps = {
  baseUrl: string | null;
  apiKey?: string | null;
  selectedModel: string | null;
  onModelSelect: (model: string | null) => void;
  disabled?: boolean;
  provider?: "ollama" | "openai-compatible";
};

export const OllamaModelPicker = ({
  baseUrl,
  apiKey,
  selectedModel,
  onModelSelect,
  disabled = false,
  provider = "ollama",
}: OllamaModelPickerProps) => {
  const [models, setModels] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveUrl = baseUrl || OLLAMA_DEFAULT_URL;

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const repo =
        provider === "openai-compatible"
          ? new OpenAICompatibleRepo(effectiveUrl, apiKey || undefined)
          : new OllamaRepo(effectiveUrl, apiKey || undefined);
      const available = await repo.checkAvailability();
      setIsAvailable(available);

      if (available) {
        const fetchedModels = await repo.getAvailableModels();
        setModels(fetchedModels);
      } else {
        setModels([]);
      }
    } catch (error) {
      console.error("Failed to fetch Ollama models", error);
      setIsAvailable(false);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUrl, apiKey, provider]);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  // Poll for availability every 3 seconds while we're showing this picker
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
          <FormattedMessage defaultMessage="Checking Ollama connection..." />
        </Typography>
      </Box>
    );
  }

  if (isAvailable === false) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
        <ErrorOutlineIcon color="error" fontSize="small" />
        <Typography variant="body2" color="error">
          <FormattedMessage defaultMessage="Unable to connect to Ollama at the specified URL." />
        </Typography>
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
          slotProps={{ inputLabel: { ...params.InputLabelProps, shrink: true } }}
        />
      )}
    />
  );
};
