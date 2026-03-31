import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Autocomplete,
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
import { API_KEY_PROVIDERS, type ApiKeyProvider } from "@voquill/types";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getModelProviderRepo } from "../../repos";
import type { FetchModelsOptions } from "../../repos/model-provider.repo";
import { getProviderFormConfig } from "./api-key-provider-config";
import { OllamaModelPicker } from "./OllamaModelPicker";
import { OpenAICompatibleModelPicker } from "./OpenAICompatibleModelPicker";
import { OpenRouterModelPicker } from "./OpenRouterModelPicker";
import { OpenRouterProviderRouting } from "./OpenRouterProviderRouting";
import { ProviderFormFields } from "./ProviderFormFields";

export type ApiKeyListContext = "transcription" | "post-processing";

type ApiKeyListProps = {
  selectedApiKeyId: string | null;
  onChange: (id: string | null) => void;
  context: ApiKeyListContext;
};

const getAvailableProviders = (context: ApiKeyListContext): ApiKeyProvider[] =>
  API_KEY_PROVIDERS.filter((p) => {
    if (p === "azure") return true;
    const repo = getModelProviderRepo(p);
    return context === "transcription"
      ? repo.supportsTranscriptionModels()
      : repo.supportsGenerativeTextModels();
  });

type AddApiKeyCardProps = {
  onSave: (
    name: string,
    provider: SettingsApiKeyProvider,
    key: string,
    baseUrl?: string,
    azureRegion?: string,
    transcriptionModel?: string,
    includeV1Path?: boolean,
  ) => Promise<void>;
  onCancel: () => void;
  context: ApiKeyListContext;
};

const AddApiKeyCard = ({ onSave, onCancel, context }: AddApiKeyCardProps) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<SettingsApiKeyProvider>("groq");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [includeV1Path, setIncludeV1Path] = useState(true);
  const [saving, setSaving] = useState(false);

  const config = useMemo(
    () => getProviderFormConfig(provider, context),
    [provider, context],
  );

  const providers = useMemo(() => getAvailableProviders(context), [context]);

  const canSave =
    !!name &&
    config.fields.filter((f) => f.required).every((f) => !!fieldValues[f.key]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      const apiKeyValue = fieldValues.apiKey || "";
      const baseUrl = fieldValues.baseUrl || config.defaultBaseUrl || undefined;
      const azureRegion = fieldValues.azureRegion || undefined;
      const transcriptionModel = fieldValues.transcriptionModel || undefined;
      const includeV1PathValue = config.showIncludeV1Path
        ? includeV1Path
        : undefined;

      await onSave(
        name,
        provider,
        apiKeyValue,
        baseUrl,
        azureRegion,
        transcriptionModel,
        includeV1PathValue,
      );
      setName("");
      setFieldValues({});
      setIncludeV1Path(true);
    } catch (error) {
      console.error("Failed to save API key", error);
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    name,
    provider,
    fieldValues,
    includeV1Path,
    config,
    onSave,
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
        onChange={(event) => {
          setProvider(event.target.value as SettingsApiKeyProvider);
          setFieldValues({});
          setIncludeV1Path(true);
        }}
        size="small"
        fullWidth
        disabled={saving}
      >
        {providers.map((p) => (
          <MenuItem key={p} value={p}>
            {getProviderFormConfig(p, context).displayName}
          </MenuItem>
        ))}
      </TextField>
      <ProviderFormFields
        config={config}
        values={fieldValues}
        onChange={handleFieldChange}
        disabled={saving}
        includeV1Path={includeV1Path}
        onIncludeV1PathChange={setIncludeV1Path}
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

type EditApiKeyCardProps = {
  apiKey: SettingsApiKey;
  onSave: (payload: {
    name: string;
    key: string;
    baseUrl?: string | null;
    azureRegion?: string | null;
    includeV1Path?: boolean | null;
    transcriptionModel?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  onTest: (overrides: Partial<SettingsApiKey>) => void;
  testing: boolean;
  context: ApiKeyListContext;
};

const EditApiKeyCard = ({
  apiKey,
  onSave,
  onCancel,
  onTest,
  testing,
  context,
}: EditApiKeyCardProps) => {
  const [name, setName] = useState(apiKey.name);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (apiKey.baseUrl) initial.baseUrl = apiKey.baseUrl;
    if (apiKey.azureRegion) initial.azureRegion = apiKey.azureRegion;
    if (apiKey.transcriptionModel)
      initial.transcriptionModel = apiKey.transcriptionModel;
    return initial;
  });
  const [includeV1Path, setIncludeV1Path] = useState(
    apiKey.includeV1Path ?? true,
  );
  const [saving, setSaving] = useState(false);

  const config = useMemo(
    () => getProviderFormConfig(apiKey.provider, context),
    [apiKey.provider, context],
  );

  const canSave =
    !!name &&
    config.fields
      .filter((f) => f.required)
      .every((f) => {
        if (f.type === "password") return true;
        return !!fieldValues[f.key];
      });

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const baseUrl =
        fieldValues.baseUrl || config.defaultBaseUrl || apiKey.baseUrl;
      const azureRegion = fieldValues.azureRegion || apiKey.azureRegion;
      const includeV1PathValue = config.showIncludeV1Path
        ? includeV1Path
        : apiKey.includeV1Path;
      const hasTranscriptionModelField = config.fields.some(
        (f) => f.key === "transcriptionModel",
      );
      const transcriptionModel = hasTranscriptionModelField
        ? fieldValues.transcriptionModel || null
        : undefined;

      await onSave({
        name,
        key: fieldValues.apiKey || "",
        baseUrl,
        azureRegion,
        includeV1Path: includeV1PathValue,
        transcriptionModel,
      });
    } catch (error) {
      console.error("Failed to save API key", error);
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    name,
    fieldValues,
    includeV1Path,
    config,
    apiKey,
    onSave,
  ]);

  const handleTest = useCallback(() => {
    const overrides: Partial<SettingsApiKey> = { name };
    if (fieldValues.apiKey) overrides.keyFull = fieldValues.apiKey;
    if (fieldValues.baseUrl || config.defaultBaseUrl)
      overrides.baseUrl = fieldValues.baseUrl || config.defaultBaseUrl;
    if (fieldValues.azureRegion)
      overrides.azureRegion = fieldValues.azureRegion;
    onTest(overrides);
  }, [name, fieldValues, config.defaultBaseUrl, onTest]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        borderColor: "primary.main",
        borderWidth: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        <FormattedMessage
          defaultMessage="Provider: {provider}"
          values={{ provider: config.displayName }}
        />
      </Typography>
      <TextField
        label={<FormattedMessage defaultMessage="Key name" />}
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        fullWidth
        disabled={saving}
      />
      <ProviderFormFields
        config={config}
        values={fieldValues}
        onChange={handleFieldChange}
        disabled={saving}
        includeV1Path={includeV1Path}
        onIncludeV1PathChange={setIncludeV1Path}
        isEditing
      />
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleTest}
          disabled={testing || saving}
        >
          {testing ? (
            <FormattedMessage defaultMessage="Testing..." />
          ) : (
            <FormattedMessage defaultMessage="Test" />
          )}
        </Button>
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

const getModelForContext = (
  apiKey: SettingsApiKey,
  context: ApiKeyListContext,
): string | null => {
  return context === "transcription"
    ? (apiKey.transcriptionModel ?? null)
    : (apiKey.postProcessingModel ?? null);
};

const ModelPickerForProvider = ({
  apiKey,
  context,
  currentModel,
  onModelChange,
  disabled,
}: {
  apiKey: SettingsApiKey;
  context: ApiKeyListContext;
  currentModel: string | null;
  onModelChange: (model: string | null) => void;
  disabled: boolean;
}) => {
  if (apiKey.provider === "openrouter" && context === "post-processing") {
    return (
      <Box onClick={(e) => e.stopPropagation()}>
        <OpenRouterModelPicker
          apiKeyId={apiKey.id}
          selectedModel={currentModel}
          onModelSelect={onModelChange}
          disabled={disabled}
        />
        <OpenRouterProviderRouting apiKeyId={apiKey.id} disabled={disabled} />
      </Box>
    );
  }

  if (apiKey.provider === "ollama" && context === "post-processing") {
    return (
      <Box onClick={(e) => e.stopPropagation()}>
        <OllamaModelPicker
          baseUrl={apiKey.baseUrl ?? null}
          apiKey={apiKey.keyFull}
          selectedModel={currentModel}
          onModelSelect={onModelChange}
          disabled={disabled}
        />
      </Box>
    );
  }

  if (
    apiKey.provider === "openai-compatible" &&
    context === "post-processing"
  ) {
    return (
      <Box onClick={(e) => e.stopPropagation()}>
        <OpenAICompatibleModelPicker
          baseUrl={apiKey.baseUrl ?? null}
          apiKey={apiKey.keyFull}
          selectedModel={currentModel}
          onModelSelect={onModelChange}
          disabled={disabled}
        />
      </Box>
    );
  }

  return (
    <GenericModelPicker
      apiKey={apiKey}
      context={context}
      currentModel={currentModel}
      onModelChange={onModelChange}
      disabled={disabled}
    />
  );
};

const GenericModelPicker = ({
  apiKey,
  context,
  currentModel,
  onModelChange,
  disabled,
}: {
  apiKey: SettingsApiKey;
  context: ApiKeyListContext;
  currentModel: string | null;
  onModelChange: (model: string | null) => void;
  disabled: boolean;
}) => {
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const repo = useMemo(
    () => getModelProviderRepo(apiKey.provider),
    [apiKey.provider],
  );

  useEffect(() => {
    const options: FetchModelsOptions = {
      apiKey: apiKey.keyFull ?? undefined,
      baseUrl: apiKey.baseUrl ?? undefined,
    };

    let cancelled = false;
    setIsLoading(true);

    const fetchFn =
      context === "transcription"
        ? repo.getTranscriptionModels(options)
        : repo.getGenerativeTextModels(options);

    fetchFn
      .then((result) => {
        if (!cancelled) setModels(result);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repo, apiKey.keyFull, apiKey.baseUrl, context]);

  if (models.length === 0 && !isLoading) return null;

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Autocomplete
        freeSolo
        options={models}
        loading={isLoading}
        value={currentModel ?? ""}
        onChange={(_event, newValue) => {
          onModelChange(newValue || null);
        }}
        onInputChange={(_event, newInputValue, reason) => {
          if (reason === "input") {
            onModelChange(newInputValue || null);
          }
        }}
        disabled={disabled}
        size="small"
        fullWidth
        renderInput={(params) => (
          <TextField
            {...params}
            label={<FormattedMessage defaultMessage="Model" />}
            placeholder="Select or type a model"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading ? <CircularProgress size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
    </Box>
  );
};

const ApiKeyCard = ({
  apiKey,
  selected,
  onSelect,
  onTest,
  onEdit,
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
  onEdit: () => void;
  testing: boolean;
  onDelete: () => void;
  deleting: boolean;
  onModelChange: (model: string | null) => void;
  context: ApiKeyListContext;
}) => {
  const config = useMemo(
    () => getProviderFormConfig(apiKey.provider, context),
    [apiKey.provider, context],
  );
  const currentModel = getModelForContext(apiKey, context);

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
            {config.displayName}
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
          <Tooltip title={<FormattedMessage defaultMessage="Edit key" />}>
            <span>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                disabled={deleting || testing}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
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
      <ModelPickerForProvider
        apiKey={apiKey}
        context={context}
        currentModel={currentModel}
        onModelChange={onModelChange}
        disabled={testing || deleting}
      />
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

  const apiKeys = allApiKeys.filter((key) => {
    if (key.provider === "azure") {
      return context === "transcription" ? !!key.azureRegion : !!key.baseUrl;
    }
    const repo = getModelProviderRepo(key.provider);
    return context === "transcription"
      ? repo.supportsTranscriptionModels()
      : repo.supportsGenerativeTextModels();
  });

  const status = useAppStore((state) => state.settings.apiKeysStatus);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingApiKeyId, setEditingApiKeyId] = useState<string | null>(null);
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
      transcriptionModel?: string,
      includeV1Path?: boolean,
    ) => {
      const created = await createApiKey({
        id: generateApiKeyId(),
        name,
        provider,
        key,
        baseUrl,
        azureRegion,
        includeV1Path,
      });

      if (transcriptionModel) {
        await updateApiKey({ id: created.id, transcriptionModel });
      }

      onChange(created.id);
      setShowAddCard(false);
    },
    [onChange],
  );

  const handleTestApiKey = useCallback(
    async (apiKey: SettingsApiKey) => {
      setTestingApiKeyId(apiKey.id);
      try {
        const config = getProviderFormConfig(apiKey.provider, context);
        const success = await config.testIntegration(apiKey, context);
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

  const handleEditApiKey = useCallback(
    async (
      apiKeyId: string,
      payload: {
        name: string;
        key: string;
        baseUrl?: string | null;
        azureRegion?: string | null;
        includeV1Path?: boolean | null;
        transcriptionModel?: string | null;
      },
    ) => {
      await updateApiKey({
        id: apiKeyId,
        name: payload.name,
        key: payload.key || undefined,
        baseUrl: payload.baseUrl,
        azureRegion: payload.azureRegion,
        includeV1Path: payload.includeV1Path,
        transcriptionModel:
          payload.transcriptionModel !== undefined
            ? payload.transcriptionModel
            : undefined,
      });
      setEditingApiKeyId(null);
    },
    [],
  );

  const handleTestEditingApiKey = useCallback(
    async (apiKey: SettingsApiKey, overrides: Partial<SettingsApiKey>) => {
      const merged = { ...apiKey, ...overrides };
      setTestingApiKeyId(apiKey.id);
      try {
        const config = getProviderFormConfig(merged.provider, context);
        const success = await config.testIntegration(merged, context);
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
          {apiKeys.map((apiKey) =>
            editingApiKeyId === apiKey.id ? (
              <EditApiKeyCard
                key={apiKey.id}
                apiKey={apiKey}
                onSave={(payload) => handleEditApiKey(apiKey.id, payload)}
                onCancel={() => setEditingApiKeyId(null)}
                onTest={(overrides) =>
                  handleTestEditingApiKey(apiKey, overrides)
                }
                testing={testingApiKeyId === apiKey.id}
                context={context}
              />
            ) : (
              <ApiKeyCard
                key={apiKey.id}
                apiKey={apiKey}
                selected={selectedApiKeyId === apiKey.id}
                onSelect={() => onChange(apiKey.id)}
                onTest={() => handleTestApiKey(apiKey)}
                onEdit={() => setEditingApiKeyId(apiKey.id)}
                testing={testingApiKeyId === apiKey.id}
                onDelete={() => handleRequestDelete(apiKey)}
                deleting={deletingApiKeyId === apiKey.id}
                onModelChange={(model) => handleModelChange(apiKey.id, model)}
                context={context}
              />
            ),
          )}
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
