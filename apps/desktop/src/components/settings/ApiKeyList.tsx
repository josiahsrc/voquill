import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  createApiKey,
  deleteApiKey,
  loadApiKeys,
} from "../../actions/api-key.actions";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import { useAppStore } from "../../store";
import {
  SettingsApiKey,
  SettingsApiKeyProvider,
} from "../../state/settings.state";
import { groqTestIntegration } from "@repo/voice-ai";

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
    throw new Error("The stored API key value is unavailable.");
  }

  switch (apiKey.provider) {
    case "groq":
      return groqTestIntegration({ apiKey: apiKey.keyFull });
    default:
      throw new Error("Testing is not available for this provider.");
  }
};

const ApiKeyCard = ({
  apiKey,
  selected,
  onSelect,
  onTest,
  onDelete,
  testing,
  deleting,
}: {
  apiKey: SettingsApiKey;
  selected: boolean;
  onSelect: () => void;
  onTest: () => void;
  testing: boolean;
  onDelete: () => void;
  deleting: boolean;
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
    <Stack direction="row" spacing={1} alignItems="center">
      <Button
        variant="outlined"
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          onTest();
        }}
        disabled={testing || deleting}
      >
        {testing ? "Testing..." : "Test"}
      </Button>
      <Tooltip title="Delete key">
        <span>
          <IconButton
            size="small"
            color="error"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={deleting || testing}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
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
  const [testingApiKeyId, setTestingApiKeyId] = useState<string | null>(null);
  const [apiKeyToDelete, setApiKeyToDelete] =
    useState<SettingsApiKey | null>(null);
  const [deletingApiKeyId, setDeletingApiKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (apiKeys.length === 0) {
      return;
    }

    if (selectedApiKeyId === null) {
      onChange(apiKeys[0]?.id ?? null);
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

  const handleTestApiKey = useCallback(
    async (apiKey: SettingsApiKey) => {
      setTestingApiKeyId(apiKey.id);
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
      } finally {
        setTestingApiKeyId(null);
      }
    },
    [],
  );

  const handleRequestDelete = useCallback((apiKey: SettingsApiKey) => {
    setApiKeyToDelete(apiKey);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    if (deletingApiKeyId !== null) {
      return;
    }
    setApiKeyToDelete(null);
  }, [deletingApiKeyId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!apiKeyToDelete) {
      return;
    }

    setDeletingApiKeyId(apiKeyToDelete.id);
    try {
      await deleteApiKey(apiKeyToDelete.id);
      showSnackbar("API key deleted", { mode: "success" });
      setApiKeyToDelete(null);
    } catch (error) {
      // Errors are surfaced via deleteApiKey.
    } finally {
      setDeletingApiKeyId(null);
    }
  }, [apiKeyToDelete, showSnackbar, deleteApiKey]);

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
                testing={testingApiKeyId === apiKey.id}
                onDelete={() => handleRequestDelete(apiKey)}
                deleting={deletingApiKeyId === apiKey.id}
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
      <Dialog
        open={apiKeyToDelete !== null}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete API key</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete the API key{" "}
            <Box component="span" fontWeight={600}>
              {apiKeyToDelete?.name ?? "this API key"}
            </Box>
            ?
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Removing the key signs you out of that provider on this device.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteDialog}
            disabled={deletingApiKeyId !== null}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deletingApiKeyId !== null}
          >
            {deletingApiKeyId !== null ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
