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
  FormControl,
  IconButton,
  InputLabel,
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
  AZURE_OPENAI_MODELS,
  azureOpenAITestIntegration,
  azureTestIntegration,
  DEEPSEEK_MODELS,
  deepseekTestIntegration,
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
import {
  OLLAMA_DEFAULT_URL,
  ollamaTestIntegration,
} from "../../utils/ollama.utils";
import { OllamaModelPicker } from "./OllamaModelPicker";
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
    baseUrl?: string,
    azureRegion?: string,
  ) => Promise<void>;
  onCancel: () => void;
  context: ApiKeyListContext;
};

const AddApiKeyCard = ({ onSave, onCancel, context }: AddApiKeyCardProps) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<SettingsApiKeyProvider>("groq");
  const [key, setKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [azureRegion, setAzureRegion] = useState("");
  const [azureOpenAIEndpoint, setAzureOpenAIEndpoint] = useState("");
  const [saving, setSaving] = useState(false);

  const isOllama = provider === "ollama";
  const isAzure = provider === "azure";
  const isAzureOpenAI = isAzure && context === "post-processing";
  const isAzureSTT = isAzure && context === "transcription";

  const canSave = isOllama
    ? !!name
    : isAzureSTT
      ? !!name && !!key && !!azureRegion
      : isAzureOpenAI
        ? !!name && !!key && !!azureOpenAIEndpoint
        : !!name && !!key;

  const handleSave = useCallback(async () => {
    if (!canSave || saving) {
      return;
    }

    setSaving(true);
    try {
      const keyToSave = key || "";
      const baseUrl = isOllama
        ? ollamaUrl || OLLAMA_DEFAULT_URL
        : isAzureOpenAI
          ? azureOpenAIEndpoint
          : undefined;
      const azureRegionValue = isAzureSTT ? azureRegion : undefined;
      await onSave(name, provider, keyToSave, baseUrl, azureRegionValue);
      setName("");
      setKey("");
      setOllamaUrl("");
      setAzureRegion("");
      setAzureOpenAIEndpoint("");
    } catch (error) {
      console.error("Failed to save API key", error);
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    isOllama,
    isAzureOpenAI,
    isAzureSTT,
    name,
    key,
    ollamaUrl,
    azureRegion,
    azureOpenAIEndpoint,
    provider,
    onSave,
    saving,
  ]);

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
        {/* OpenRouter, Ollama, DeepSeek, and Azure OpenAI only support LLM, not transcription */}
        {context === "post-processing" && (
          <MenuItem value="openrouter">OpenRouter</MenuItem>
        )}
        {context === "post-processing" && (
          <MenuItem value="ollama">Ollama</MenuItem>
        )}
        {context === "post-processing" && (
          <MenuItem value="deepseek">DeepSeek</MenuItem>
        )}
        {context === "post-processing" && (
          <MenuItem value="azure">Azure OpenAI</MenuItem>
        )}
        {/* Aldea, AssemblyAI, and Azure STT only support transcription, not post-processing */}
        {context === "transcription" && (
          <MenuItem value="aldea">Aldea</MenuItem>
        )}
        {context === "transcription" && (
          <MenuItem value="assemblyai">AssemblyAI</MenuItem>
        )}
        {context === "transcription" && (
          <MenuItem value="azure">Azure</MenuItem>
        )}
      </TextField>
      {isAzure ? (
        context === "transcription" ? (
          <>
            <TextField
              label={<FormattedMessage defaultMessage="Azure Region" />}
              value={azureRegion}
              onChange={(event) => setAzureRegion(event.target.value)}
              placeholder="e.g., eastus, westus, northeurope"
              size="small"
              fullWidth
              disabled={saving}
              helperText={
                <FormattedMessage defaultMessage="Azure service region for Speech-to-Text" />
              }
            />
            <TextField
              label={<FormattedMessage defaultMessage="Subscription Key" />}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Paste your Azure subscription key"
              size="small"
              fullWidth
              type="password"
              disabled={saving}
            />
          </>
        ) : (
          <>
            <TextField
              label={
                <FormattedMessage defaultMessage="Azure OpenAI Endpoint" />
              }
              value={azureOpenAIEndpoint}
              onChange={(event) => setAzureOpenAIEndpoint(event.target.value)}
              placeholder="https://my-resource.openai.azure.com"
              size="small"
              fullWidth
              disabled={saving}
              helperText={
                <FormattedMessage defaultMessage="Your Azure OpenAI resource endpoint URL" />
              }
            />
            <TextField
              label={<FormattedMessage defaultMessage="API Key" />}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Paste your Azure OpenAI API key"
              size="small"
              fullWidth
              type="password"
              disabled={saving}
            />
          </>
        )
      ) : isOllama ? (
        <>
          <TextField
            label={<FormattedMessage defaultMessage="Ollama URL" />}
            value={ollamaUrl}
            onChange={(event) => setOllamaUrl(event.target.value)}
            placeholder={OLLAMA_DEFAULT_URL}
            size="small"
            fullWidth
            disabled={saving}
            helperText={
              <FormattedMessage defaultMessage="Leave empty to use the default URL" />
            }
          />
          <TextField
            label={<FormattedMessage defaultMessage="API key (optional)" />}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="Leave empty if not required"
            size="small"
            fullWidth
            type="password"
            disabled={saving}
            helperText={
              <FormattedMessage defaultMessage="Only needed if your Ollama instance requires authentication" />
            }
          />
        </>
      ) : (
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
      )}
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
          disabled={!canSave || saving}
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

const testApiKey = async (
  apiKey: SettingsApiKey,
  context: ApiKeyListContext,
): Promise<boolean> => {
  if (apiKey.provider === "ollama") {
    return ollamaTestIntegration({
      baseUrl: apiKey.baseUrl || OLLAMA_DEFAULT_URL,
      apiKey: apiKey.keyFull || undefined,
    });
  }

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
    case "deepseek":
      return deepseekTestIntegration({ apiKey: apiKey.keyFull });
    case "azure":
      if (context === "post-processing") {
        if (!apiKey.baseUrl) {
          throw new Error("Azure OpenAI endpoint is required.");
        }
        return azureOpenAITestIntegration({
          apiKey: apiKey.keyFull,
          endpoint: apiKey.baseUrl,
        });
      } else {
        if (!apiKey.azureRegion) {
          throw new Error("Azure region is required.");
        }
        return azureTestIntegration({
          subscriptionKey: apiKey.keyFull,
          region: apiKey.azureRegion,
        });
      }
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
      return context === "transcription" ? [] : OPENROUTER_FAVORITE_MODELS;
    case "ollama":
      return [];
    case "deepseek":
      return context === "transcription" ? [] : DEEPSEEK_MODELS;
    case "azure":
      return context === "transcription" ? [] : AZURE_OPENAI_MODELS;
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
      ) : apiKey.provider === "ollama" && context === "post-processing" ? (
        <Box onClick={(e) => e.stopPropagation()}>
          <OllamaModelPicker
            baseUrl={apiKey.baseUrl ?? null}
            apiKey={apiKey.keyFull}
            selectedModel={currentModel}
            onModelSelect={onModelChange}
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

  // Filter API keys based on context
  const apiKeys = allApiKeys.filter((key) => {
    // OpenRouter, Ollama, and DeepSeek only support post-processing
    if (
      context === "transcription" &&
      (key.provider === "openrouter" ||
        key.provider === "ollama" ||
        key.provider === "deepseek")
    ) {
      return false;
    }
    // Aldea and AssemblyAI only support transcription
    if (
      context === "post-processing" &&
      (key.provider === "aldea" || key.provider === "assemblyai")
    ) {
      return false;
    }
    // Azure can be either STT or OpenAI - filter based on stored config
    if (key.provider === "azure") {
      if (context === "transcription") {
        // Show only Azure STT keys (those with azureRegion)
        return !!key.azureRegion;
      } else {
        // Show only Azure OpenAI keys (those with baseUrl/endpoint)
        return !!key.baseUrl;
      }
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
    async (
      name: string,
      provider: SettingsApiKeyProvider,
      key: string,
      baseUrl?: string,
      azureRegion?: string,
    ) => {
      const created = await createApiKey({
        id: generateApiKeyId(),
        name,
        provider,
        key,
        baseUrl,
        azureRegion,
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
        const success = await testApiKey(apiKey, context);
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
    [context],
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
