import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
} from "@mui/material";
import type { LlmProvider } from "@repo/types";
import { useState } from "react";
import { upsertLlmProvider } from "../../actions/llm-providers.actions";
import { useAppStore } from "../../store";

const SCHEMA_OPTIONS = [
  { value: "openai", label: "OpenAI" },
] as const;

export type LlmProviderFormState = {
  id: string;
  name: string;
  schema: string;
  url: string;
  apiKey: string;
  model: string;
  isEnabled: boolean;
};

const EMPTY_FORM: LlmProviderFormState = {
  id: "",
  name: "",
  schema: "",
  url: "",
  apiKey: "",
  model: "",
  isEnabled: true,
};

export function emptyForm(): LlmProviderFormState {
  return { ...EMPTY_FORM };
}

export function formFromProvider(p: LlmProvider): LlmProviderFormState {
  return {
    id: p.id,
    name: p.name,
    schema: p.provider,
    url: p.url,
    apiKey: "",
    model: p.model,
    isEnabled: p.isEnabled,
  };
}

export type LlmProviderDialogProps = {
  open: boolean;
  form: LlmProviderFormState;
  onFormChange: (form: LlmProviderFormState) => void;
  onClose: () => void;
};

export const LlmProviderDialog = ({
  open,
  form,
  onFormChange,
  onClose,
}: LlmProviderDialogProps) => {
  const providerById = useAppStore((state) => state.llmProviderById);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(form.id && providerById[form.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertLlmProvider({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        provider: form.schema,
        url: form.url,
        apiKey: form.apiKey,
        model: form.model,
        isEnabled: form.isEnabled,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    !saving &&
    form.name.trim() &&
    form.schema &&
    form.url.trim() &&
    form.model.trim() &&
    (isEdit || form.apiKey.trim());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit Provider" : "Add Provider"}</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          pt: "16px !important",
        }}
      >
        <TextField
          label="Name"
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        />
        <TextField
          label="Schema"
          fullWidth
          size="small"
          select
          value={form.schema}
          onChange={(e) => onFormChange({ ...form, schema: e.target.value })}
        >
          {SCHEMA_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="URL"
          fullWidth
          size="small"
          value={form.url}
          onChange={(e) => onFormChange({ ...form, url: e.target.value })}
        />
        <TextField
          label="API Key"
          fullWidth
          size="small"
          type="password"
          value={form.apiKey}
          onChange={(e) => onFormChange({ ...form, apiKey: e.target.value })}
          helperText={isEdit ? "Leave empty to keep the current key" : undefined}
        />
        <TextField
          label="Model"
          fullWidth
          size="small"
          value={form.model}
          onChange={(e) => onFormChange({ ...form, model: e.target.value })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.isEnabled}
              onChange={(e) =>
                onFormChange({ ...form, isEnabled: e.target.checked })
              }
            />
          }
          label="Enabled"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {saving ? <CircularProgress size={20} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
