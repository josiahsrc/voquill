import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { createApiKey, loadApiKeys } from "../../actions/api-key.actions";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import { useAppStore } from "../../store";
import {
  SettingsApiKey,
  SettingsApiKeyProvider,
} from "../../state/settings.state";

type ApiKeyListProps = {
  selectedApiKeyId: string | null;
  onChange: (id: string | null) => void;
};

type AddApiKeyCardProps = {
  onSave: (
    name: string,
    provider: SettingsApiKeyProvider,
    key: string,
  ) => Promise<void>;
  onCancel: () => void;
};

const AddApiKeyCard = ({ onSave, onCancel }: AddApiKeyCardProps) => {
  const [name, setName] = useState("");
  const [provider, setProvider] =
    useState<SettingsApiKeyProvider>("groq");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name || !key || saving) {
      return;
    }

    setSaving(true);
    try {
      await onSave(name, provider, key);
      setName("");
      setKey("");
    } catch (error) {
      console.error("Failed to save API key", error);
    } finally {
      setSaving(false);
    }
  }, [name, key, provider, onSave, saving]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <TextField
        label="Key name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g., My Groq Key"
        size="small"
        fullWidth
        disabled={saving}
      />
      <TextField
        select
        label="Provider"
        value={provider}
        onChange={(event) =>
          setProvider(event.target.value as SettingsApiKeyProvider)
        }
        size="small"
        fullWidth
        disabled={saving}
      >
        <MenuItem value="groq">Groq</MenuItem>
      </TextField>
      <TextField
        label="API key"
        value={key}
        onChange={(event) => setKey(event.target.value)}
        placeholder="Paste your API key"
        size="small"
        fullWidth
        type="password"
        disabled={saving}
      />
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          size="small"
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={!name || !key || saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </Box>
    </Paper>
  );
};

const testApiKey = async (apiKey: SettingsApiKey): Promise<boolean> => {
  if (!apiKey.keyFull) {
    showErrorSnackbar("Cannot validate API key without the stored key value.");
    return false;
  }

  // TODO: Implement provider-specific validation using stored key material.
  console.log("Testing API key with provider:", apiKey.provider);
  return true;
};

const ApiKeyCard = ({
  apiKey,
  selected,
  onSelect,
  onTest,
}: {
  apiKey: SettingsApiKey;
  selected: boolean;
  onSelect: () => void;
  onTest: () => void;
}) => (
  <Paper
    variant="outlined"
    onClick={onSelect}
    sx={{
      p: 2,
      borderColor: selected ? "primary.main" : "divider",
      borderWidth: 1,
      cursor: "pointer",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      boxShadow: selected
        ? (theme) => `0 0 0 1px ${theme.palette.primary.main}`
        : "none",
      ":hover": {
        borderColor: selected ? "primary.main" : "action.active",
      },
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
      width: "100%",
    }}
  >
    <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle1" fontWeight={600}>
        {apiKey.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {apiKey.provider.toUpperCase()}
      </Typography>
      {apiKey.keySuffix ? (
        <Typography variant="caption" color="text.secondary">
          Ends with {apiKey.keySuffix}
        </Typography>
      ) : null}
    </Stack>
    <Button
      variant="outlined"
      size="small"
      onClick={(event) => {
        event.stopPropagation();
        onTest();
      }}
    >
      Test
    </Button>
  </Paper>
);

const generateApiKeyId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const ApiKeyList = ({
  selectedApiKeyId,
  onChange,
}: ApiKeyListProps) => {
  const apiKeys = useAppStore((state) => state.settings.apiKeys);
  const status = useAppStore((state) => state.settings.apiKeysStatus);
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    void loadApiKeys();
  }, []);

  useEffect(() => {
    if (apiKeys.length === 0) {
      if (selectedApiKeyId !== null) {
        onChange(null);
      }
      return;
    }

    const exists = apiKeys.some((key) => key.id === selectedApiKeyId);
    if (!exists) {
      onChange(apiKeys[0]?.id ?? null);
    }
  }, [apiKeys, selectedApiKeyId, onChange]);

  const handleAddApiKey = useCallback(
    async (
      name: string,
      provider: SettingsApiKeyProvider,
      key: string,
    ) => {
      const created = await createApiKey({
        id: generateApiKeyId(),
        name,
        provider,
        key,
      });

      onChange(created.id);
      setShowAddCard(false);
    },
    [onChange],
  );

  const handleTestApiKey = useCallback(async (apiKey: SettingsApiKey) => {
    try {
      const success = await testApiKey(apiKey);
      if (success) {
        showSnackbar("Integration successful", { mode: "success" });
      } else {
        showErrorSnackbar("Integration failed. Provide a valid API key.");
      }
    } catch (error) {
      showErrorSnackbar(
        error instanceof Error ? error.message : "API key test failed.",
      );
    }
  }, []);

  const handleRetryLoad = useCallback(() => {
    void loadApiKeys();
  }, []);

  const loadingState = (
    <Stack spacing={1} alignItems="center">
      <CircularProgress size={24} />
      <Typography variant="body2" color="text.secondary">
        Loading API keys…
      </Typography>
    </Stack>
  );

  const errorState = (
    <Stack spacing={1.5} alignItems="flex-start">
      <Typography variant="subtitle1" fontWeight={600}>
        Failed to load API keys
      </Typography>
      <Typography variant="body2" color="text.secondary">
        We couldn&apos;t load your saved API keys. Please try again.
      </Typography>
      <Button variant="outlined" onClick={handleRetryLoad}>
        Retry
      </Button>
    </Stack>
  );

  const emptyState = (
    <Stack spacing={1.5} alignItems="flex-start">
      <Typography variant="subtitle1" fontWeight={600}>
        No API keys yet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Connect a transcription provider like Groq with your API key.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setShowAddCard(true)}
      >
        Add API key
      </Button>
    </Stack>
  );

  const shouldShowLoading = status === "loading" && apiKeys.length === 0;
  const shouldShowError = status === "error" && apiKeys.length === 0;
  const shouldShowEmpty = apiKeys.length === 0 && !showAddCard && !shouldShowLoading && !shouldShowError;

  return (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      {shouldShowLoading
        ? loadingState
        : shouldShowError
        ? errorState
        : shouldShowEmpty
        ? emptyState
        : (
          <Stack spacing={1.5} alignItems="stretch" sx={{ width: "100%" }}>
            {apiKeys.map((apiKey) => (
              <ApiKeyCard
                key={apiKey.id}
                apiKey={apiKey}
                selected={selectedApiKeyId === apiKey.id}
                onSelect={() => onChange(apiKey.id)}
                onTest={() => handleTestApiKey(apiKey)}
              />
            ))}
          </Stack>
        )}
      {showAddCard ? (
        <AddApiKeyCard
          onSave={handleAddApiKey}
          onCancel={() => setShowAddCard(false)}
        />
      ) : apiKeys.length > 0 || shouldShowError ? (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setShowAddCard(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          Add another key
        </Button>
      ) : null}
    </Stack>
  );
};
