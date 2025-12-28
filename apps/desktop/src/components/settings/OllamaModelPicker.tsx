import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { OllamaRepo } from "../../repos/ollama.repo";
import { OLLAMA_DEFAULT_URL } from "../../utils/ollama.utils";

type OllamaModelPickerProps = {
  baseUrl: string | null;
  selectedModel: string | null;
  onModelSelect: (model: string | null) => void;
  disabled?: boolean;
};

export const OllamaModelPicker = ({
  baseUrl,
  selectedModel,
  onModelSelect,
  disabled = false,
}: OllamaModelPickerProps) => {
  const [models, setModels] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveUrl = baseUrl || OLLAMA_DEFAULT_URL;

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const repo = new OllamaRepo(effectiveUrl);
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
  }, [effectiveUrl]);

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
    <FormControl fullWidth size="small">
      <InputLabel id="ollama-model-label" shrink>
        <FormattedMessage defaultMessage="Model" />
      </InputLabel>
      <Select
        labelId="ollama-model-label"
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
