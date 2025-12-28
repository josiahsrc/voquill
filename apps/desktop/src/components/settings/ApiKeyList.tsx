import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  aldeaTestIntegration,
  assemblyaiTestIntegration,
  GENERATE_TEXT_MODELS,
  groqTestIntegration,
  OPENAI_GENERATE_TEXT_MODELS,
  OPENAI_TRANSCRIPTION_MODELS,
  openaiTestIntegration,
  OPENROUTER_FAVORITE_MODELS,
  openrouterTestIntegration,
  TRANSCRIPTION_MODELS,
} from "@repo/voice-ai";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  createApiKey,
  deleteApiKey,
  loadApiKeys,
  updateApiKey,
} from "../../actions/api-key.actions";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import {
  SettingsApiKey,
  SettingsApiKeyProvider,
} from "../../state/settings.state";
import { useAppStore } from "../../store";
import { OpenRouterModelPicker } from "./OpenRouterModelPicker";
import { OpenRouterProviderRouting } from "./OpenRouterProviderRouting";

export type ApiKeyListContext = "transcription" | "post-processing";

type ApiKeyListProps = {
  selectedApiKeyId: string | null;
  onChange: (id: string | null) => void;
  context: ApiKeyListContext;
};

type AddApiKeyCardProps = {
  onSave: (
    name: string,
    provider: SettingsApiKeyProvider,
    key: string,
  ) => Promise<void>;
  onCancel: () => void;
  context: ApiKeyListContext;
};

const AddApiKeyCard = ({ onSave, onCancel, context }: AddApiKeyCardProps) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<SettingsApiKeyProvider>("groq");
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
        label={<FormattedMessage defaultMessage="Key name" />}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g., My API Key"
        size="small"
        fullWidth
        disabled={saving}
      />
      <TextField
        select
        label={<FormattedMessage defaultMessage="Provider" />}
        value={provider}
        onChange={(event) =>
          setProvider(event.target.value as SettingsApiKeyProvider)
        }
        size="small"
        fullWidth
        disabled={saving}
      >
        <MenuItem value="groq">Groq</MenuItem>
        <MenuItem value="openai">OpenAI</MenuItem>
        {/* OpenRouter only supports LLM, not transcription */}
        {context === "post-processing" && (
          <MenuItem value="openrouter">OpenRouter</MenuItem>
        )}
        <MenuItem value="aldea">Aldea</MenuItem>
        <MenuItem value="assemblyai">AssemblyAI</MenuItem>
      </TextField>
      <TextField
        label={<FormattedMessage defaultMessage="API key" />}
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
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={!name || !key || saving}
        >
          {saving ? (
            <FormattedMessage defaultMessage="Saving..." />
          ) : (
            <FormattedMessage defaultMessage="Save" />
          )}
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
    case "openai":
      return openaiTestIntegration({ apiKey: apiKey.keyFull });
    case "openrouter":
      return openrouterTestIntegration({ apiKey: apiKey.keyFull });
    case "aldea":
      return aldeaTestIntegration({ apiKey: apiKey.keyFull });
    case "assemblyai":
      return assemblyaiTestIntegration({ apiKey: apiKey.keyFull });
    default:
      throw new Error("Testing is not available for this provider.");
  }
};

const getModelsForProvider = (
  provider: SettingsApiKeyProvider,
  context: ApiKeyListContext,
): readonly string[] => {
  switch (provider) {
    case "groq":
      return context === "transcription"
        ? TRANSCRIPTION_MODELS
        : GENERATE_TEXT_MODELS;
    case "openai":
      return context === "transcription"
        ? OPENAI_TRANSCRIPTION_MODELS
        : OPENAI_GENERATE_TEXT_MODELS;
    case "openrouter":
      // OpenRouter doesn't support transcription, only post-processing
      return context === "transcription" ? [] : OPENROUTER_FAVORITE_MODELS;
    case "aldea":
      return [];
    case "assemblyai":
      return [];
    default:
      return [];
  }
};

const getModelForContext = (
  apiKey: SettingsApiKey,
  context: ApiKeyListContext,
): string | null => {
  return context === "transcription"
    ? (apiKey.transcriptionModel ?? null)
    : (apiKey.postProcessingModel ?? null);
};

const ApiKeyCard = ({
  apiKey,
  selected,
  onSelect,
  onTest,
  onDelete,
  testing,
  deleting,
  onModelChange,
  context,
}: {
  apiKey: SettingsApiKey;
  selected: boolean;
  onSelect: () => void;
  onTest: () => void;
  testing: boolean;
  onDelete: () => void;
  deleting: boolean;
  onModelChange: (model: string | null) => void;
  context: ApiKeyListContext;
}) => {
  const models = getModelsForProvider(apiKey.provider, context);
  const currentModel = getModelForContext(apiKey, context) ?? models[0] ?? null;

  return (
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
        flexDirection: "column",
        gap: 2,
        width: "100%",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        sx={{ width: "100%" }}
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
              <FormattedMessage
                defaultMessage="Ends with {suffix}"
                values={{ suffix: apiKey.keySuffix }}
              />
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
            {testing ? (
              <FormattedMessage defaultMessage="Testing..." />
            ) : (
              <FormattedMessage defaultMessage="Test" />
            )}
          </Button>
          <Tooltip title={<FormattedMessage defaultMessage="Delete key" />}>
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
      </Stack>
      {/* OpenRouter gets special model picker and routing UI */}
      {apiKey.provider === "openrouter" && context === "post-processing" ? (
        <Box onClick={(e) => e.stopPropagation()}>
          <OpenRouterModelPicker
            apiKeyId={apiKey.id}
            selectedModel={currentModel}
            onModelSelect={onModelChange}
            disabled={testing || deleting}
          />
          <OpenRouterProviderRouting
            apiKeyId={apiKey.id}
            disabled={testing || deleting}
          />
        </Box>
      ) : models.length > 0 ? (
        <FormControl fullWidth size="small">
          <InputLabel id={`model-select-label-${apiKey.id}`}>
            <FormattedMessage defaultMessage="Model" />
          </InputLabel>
          <Select
            labelId={`model-select-label-${apiKey.id}`}
            value={currentModel ?? ""}
            label={<FormattedMessage defaultMessage="Model" />}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const value = event.target.value || null;
              onModelChange(value);
            }}
            disabled={testing || deleting}
          >
            {models.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
    </Paper>
  );
};

const generateApiKeyId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const ApiKeyList = ({
  selectedApiKeyId,
  onChange,
  context,
}: ApiKeyListProps) => {
  const allApiKeys = useAppStore((state) => state.settings.apiKeys);

  // Filter API keys based on context - OpenRouter only supports post-processing
  const apiKeys = allApiKeys.filter((key) => {
    if (context === "transcription" && key.provider === "openrouter") {
      return false;
    }
    return true;
  });
  const status = useAppStore((state) => state.settings.apiKeysStatus);
  const [showAddCard, setShowAddCard] = useState(false);
  const [testingApiKeyId, setTestingApiKeyId] = useState<string | null>(null);
  const [apiKeyToDelete, setApiKeyToDelete] = useState<SettingsApiKey | null>(
    null,
  );
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
    async (name: string, provider: SettingsApiKeyProvider, key: string) => {
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
  }, []);

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
    } catch {
      // Errors are surfaced via deleteApiKey.
    } finally {
      setDeletingApiKeyId(null);
    }
  }, [apiKeyToDelete, showSnackbar, deleteApiKey]);

  const handleRetryLoad = useCallback(() => {
    void loadApiKeys();
  }, []);

  const handleModelChange = useCallback(
    async (apiKeyId: string, model: string | null) => {
      try {
        if (context === "transcription") {
          await updateApiKey({ id: apiKeyId, transcriptionModel: model });
        } else {
          await updateApiKey({ id: apiKeyId, postProcessingModel: model });
        }
      } catch {
        // Errors are surfaced via updateApiKey.
      }
    },
    [context],
  );

  const loadingState = (
    <Stack spacing={1} alignItems="center">
      <CircularProgress size={24} />
      <Typography variant="body2" color="text.secondary">
        <FormattedMessage defaultMessage="Loading API keys…" />
      </Typography>
    </Stack>
  );

  const errorState = (
    <Stack spacing={1.5} alignItems="flex-start">
      <Typography variant="subtitle1" fontWeight={600}>
        <FormattedMessage defaultMessage="Failed to load API keys" />
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <FormattedMessage defaultMessage="We couldn't load your saved API keys. Please try again." />
      </Typography>
      <Button variant="outlined" onClick={handleRetryLoad}>
        <FormattedMessage defaultMessage="Retry" />
      </Button>
    </Stack>
  );

  const emptyState = (
    <Stack spacing={1.5} alignItems="flex-start">
      <Typography variant="subtitle1" fontWeight={600}>
        <FormattedMessage defaultMessage="No API keys yet" />
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <FormattedMessage defaultMessage="Connect a transcription provider like Groq with your API key." />
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setShowAddCard(true)}
      >
        <FormattedMessage defaultMessage="Add API key" />
      </Button>
    </Stack>
  );

  const shouldShowLoading = status === "loading" && apiKeys.length === 0;
  const shouldShowError = status === "error" && apiKeys.length === 0;
  const shouldShowEmpty =
    apiKeys.length === 0 &&
    !showAddCard &&
    !shouldShowLoading &&
    !shouldShowError;

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Grab an API key from the" />
        </Typography>
        <Link
          href="https://console.groq.com/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <FormattedMessage defaultMessage="Groq Console" />
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </Link>
      </Stack>
      {shouldShowLoading ? (
        loadingState
      ) : shouldShowError ? (
        errorState
      ) : shouldShowEmpty ? (
        emptyState
      ) : (
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
              onModelChange={(model) => handleModelChange(apiKey.id, model)}
              context={context}
            />
          ))}
        </Stack>
      )}
      {showAddCard ? (
        <AddApiKeyCard
          onSave={handleAddApiKey}
          onCancel={() => setShowAddCard(false)}
          context={context}
        />
      ) : apiKeys.length > 0 || shouldShowError ? (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setShowAddCard(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          <FormattedMessage defaultMessage="Add another key" />
        </Button>
      ) : null}
      <Dialog
        open={apiKeyToDelete !== null}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <FormattedMessage defaultMessage="Delete API key" />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <FormattedMessage
              defaultMessage="Are you sure you want to delete the API key {keyName}?"
              values={{
                keyName: (
                  <Box component="span" fontWeight={600}>
                    {apiKeyToDelete?.name ?? "this API key"}
                  </Box>
                ),
              }}
            />
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <FormattedMessage defaultMessage="Removing the key signs you out of that provider on this device." />
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteDialog}
            disabled={deletingApiKeyId !== null}
          >
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deletingApiKeyId !== null}
          >
            {deletingApiKeyId !== null ? (
              <FormattedMessage defaultMessage="Deleting..." />
            ) : (
              <FormattedMessage defaultMessage="Delete" />
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
