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
import type { SttProvider } from "@repo/types";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { upsertSttProvider } from "../../actions/stt-providers.actions";
import { useAppStore } from "../../store";
import { getSttProviderModels } from "../../utils/provider-models.utils";
import { ModelAutocomplete } from "../common/ModelAutocomplete";

const PROVIDER_OPTIONS = [
  { value: "speaches", label: "Speaches" },
  { value: "groq", label: "Groq" },
] as const;

const PROVIDERS_WITH_URL = new Set(["speaches"]);

export type SttProviderFormState = {
  id: string;
  name: string;
  provider: string;
  url: string;
  apiKey: string;
  model: string;
  isEnabled: boolean;
};

const EMPTY_FORM: SttProviderFormState = {
  id: "",
  name: "",
  provider: "",
  url: "",
  apiKey: "",
  model: "",
  isEnabled: true,
};

export function emptyForm(): SttProviderFormState {
  return { ...EMPTY_FORM };
}

export function formFromProvider(p: SttProvider): SttProviderFormState {
  return {
    id: p.id,
    name: p.name,
    provider: p.provider,
    url: p.url,
    apiKey: "",
    model: p.model,
    isEnabled: p.isEnabled,
  };
}

export type SttProviderDialogProps = {
  open: boolean;
  form: SttProviderFormState;
  onFormChange: (form: SttProviderFormState) => void;
  onClose: () => void;
};

export const SttProviderDialog = ({
  open,
  form,
  onFormChange,
  onClose,
}: SttProviderDialogProps) => {
  const intl = useIntl();
  const providerById = useAppStore((state) => state.sttProviderById);
  const [saving, setSaving] = useState(false);
  const models = getSttProviderModels(form.provider);

  const isEdit = Boolean(form.id && providerById[form.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertSttProvider({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        provider: form.provider,
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

  const needsUrl = PROVIDERS_WITH_URL.has(form.provider);

  const canSave =
    !saving &&
    form.name.trim() &&
    form.provider &&
    (!needsUrl || form.url.trim()) &&
    form.model.trim();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? <FormattedMessage defaultMessage="Edit Provider" /> : <FormattedMessage defaultMessage="Add Provider" />}
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          pt: "16px !important",
        }}
      >
        <TextField
          label={intl.formatMessage({ defaultMessage: "Provider" })}
          fullWidth
          size="small"
          select
          value={form.provider}
          onChange={(e) => onFormChange({ ...form, provider: e.target.value })}
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={intl.formatMessage({ defaultMessage: "Name" })}
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        />
        {needsUrl && (
          <TextField
            label={intl.formatMessage({ defaultMessage: "URL" })}
            fullWidth
            size="small"
            value={form.url}
            onChange={(e) => onFormChange({ ...form, url: e.target.value })}
          />
        )}
        <TextField
          label={intl.formatMessage({ defaultMessage: "API Key" })}
          fullWidth
          size="small"
          type="password"
          value={form.apiKey}
          onChange={(e) => onFormChange({ ...form, apiKey: e.target.value })}
          helperText={isEdit ? intl.formatMessage({ defaultMessage: "Leave empty to keep the current key" }) : undefined}
        />
        <ModelAutocomplete
          label={intl.formatMessage({ defaultMessage: "Model" })}
          value={form.model}
          onChange={(value) => onFormChange({ ...form, model: value })}
          options={models}
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
          label={<FormattedMessage defaultMessage="Enabled" />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {saving ? <CircularProgress size={20} /> : <FormattedMessage defaultMessage="Save" />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
