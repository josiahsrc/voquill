import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
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
