import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from "@mui/material";
import type { OidcProvider } from "@repo/types";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { upsertOidcProvider } from "../../actions/oidc-providers.actions";
import { useAppStore } from "../../store";

export type OidcProviderFormState = {
  id: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  isEnabled: boolean;
};

const EMPTY_FORM: OidcProviderFormState = {
  id: "",
  name: "",
  issuerUrl: "",
  clientId: "",
  clientSecret: "",
  isEnabled: true,
};

export function emptyForm(): OidcProviderFormState {
  return { ...EMPTY_FORM };
}

export function formFromProvider(p: OidcProvider): OidcProviderFormState {
  return {
    id: p.id,
    name: p.name,
    issuerUrl: p.issuerUrl,
    clientId: p.clientId,
    clientSecret: "",
    isEnabled: p.isEnabled,
  };
}

export type OidcProviderDialogProps = {
  open: boolean;
  form: OidcProviderFormState;
  onFormChange: (form: OidcProviderFormState) => void;
  onClose: () => void;
};

export const OidcProviderDialog = ({
  open,
  form,
  onFormChange,
  onClose,
}: OidcProviderDialogProps) => {
  const intl = useIntl();
  const providerById = useAppStore((state) => state.oidcProviderById);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(form.id && providerById[form.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertOidcProvider({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        issuerUrl: form.issuerUrl,
        clientId: form.clientId,
        clientSecret: form.clientSecret || undefined,
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
    form.issuerUrl.trim() &&
    form.clientId.trim() &&
    (isEdit || form.clientSecret.trim());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? (
          <FormattedMessage defaultMessage="Edit Identity Provider" />
        ) : (
          <FormattedMessage defaultMessage="Add Identity Provider" />
        )}
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
          label={intl.formatMessage({ defaultMessage: "Name" })}
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        />
        <TextField
          label={intl.formatMessage({ defaultMessage: "Issuer URL" })}
          fullWidth
          size="small"
          value={form.issuerUrl}
          onChange={(e) => onFormChange({ ...form, issuerUrl: e.target.value })}
          placeholder="https://login.example.com"
        />
        <TextField
          label={intl.formatMessage({ defaultMessage: "Client ID" })}
          fullWidth
          size="small"
          value={form.clientId}
          onChange={(e) => onFormChange({ ...form, clientId: e.target.value })}
        />
        <TextField
          label={intl.formatMessage({ defaultMessage: "Client Secret" })}
          fullWidth
          size="small"
          type="password"
          value={form.clientSecret}
          onChange={(e) =>
            onFormChange({ ...form, clientSecret: e.target.value })
          }
          helperText={
            isEdit
              ? intl.formatMessage({
                  defaultMessage: "Leave empty to keep the current secret",
                })
              : undefined
          }
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
          {saving ? (
            <CircularProgress size={20} />
          ) : (
            <FormattedMessage defaultMessage="Save" />
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
