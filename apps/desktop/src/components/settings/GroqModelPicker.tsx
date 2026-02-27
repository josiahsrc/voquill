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
import { fetch } from "@tauri-apps/plugin-http";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

type GroqModelPickerProps = {
  apiKey: string | null;
  selectedModel: string | null;
  onModelSelect: (model: string | null) => void;
  disabled?: boolean;
};

export const GroqModelPicker = ({
  apiKey,
  selectedModel,
  onModelSelect,
  disabled = false,
}: GroqModelPickerProps) => {
  const [models, setModels] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchModels = useCallback(async () => {
    if (!apiKey) {
      setModels([]);
      setIsAvailable(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(GROQ_MODELS_URL, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        setIsAvailable(false);
        setModels([]);
        return;
      }

      setIsAvailable(true);
      const payload = (await response.json()) as {
        data?: Array<{ id?: string }>;
      };
      const fetched = (payload.data ?? [])
        .map((m) => (m.id ?? "").trim())
        .filter(Boolean)
        .sort();
      setModels(fetched);
    } catch (error) {
      console.error("Failed to fetch Groq models", error);
      setIsAvailable(false);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  if (!apiKey) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        <FormattedMessage defaultMessage="Add an API key to see available models" />
      </Typography>
    );
  }

  if (isLoading && isAvailable === null) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Loading models..." />
        </Typography>
      </Box>
    );
  }

  if (isAvailable === false) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
        <ErrorOutlineIcon color="error" fontSize="small" />
        <Typography variant="body2" color="error">
          <FormattedMessage defaultMessage="Unable to fetch models from Groq." />
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="groq-model-label" shrink>
        <FormattedMessage defaultMessage="Model" />
      </InputLabel>
      <Select
        labelId="groq-model-label"
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
