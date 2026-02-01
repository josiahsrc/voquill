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
import type { Term } from "@repo/types";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { upsertGlobalTerm } from "../../actions/terms.actions";
import { useAppStore } from "../../store";

type TermFormState = {
  id: string;
  sourceValue: string;
  destinationValue: string;
  isReplacement: boolean;
};

const EMPTY_FORM: TermFormState = {
  id: "",
  sourceValue: "",
  destinationValue: "",
  isReplacement: false,
};

export function formFromTerm(term: Term): TermFormState {
  return {
    id: term.id,
    sourceValue: term.sourceValue,
    destinationValue: term.destinationValue,
    isReplacement: term.isReplacement,
  };
}

export function emptyForm(): TermFormState {
  return { ...EMPTY_FORM, id: crypto.randomUUID() };
}

export type TermDialogProps = {
  open: boolean;
  form: TermFormState;
  onFormChange: (form: TermFormState) => void;
  onClose: () => void;
};

export const TermDialog = ({
  open,
  form,
  onFormChange,
  onClose,
}: TermDialogProps) => {
  const intl = useIntl();
  const termById = useAppStore((state) => state.termById);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = termById[form.id];
      await upsertGlobalTerm({
        id: form.id,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        sourceValue: form.sourceValue,
        destinationValue: form.destinationValue,
        isReplacement: form.isReplacement,
        isGlobal: true,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(termById[form.id]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? (
          <FormattedMessage defaultMessage="Edit Term" />
        ) : (
          <FormattedMessage defaultMessage="Add Term" />
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
          label={intl.formatMessage({ defaultMessage: "Source Value" })}
          fullWidth
          size="small"
          multiline
          minRows={2}
          value={form.sourceValue}
          onChange={(e) =>
            onFormChange({ ...form, sourceValue: e.target.value })
          }
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.isReplacement}
              onChange={(e) =>
                onFormChange({ ...form, isReplacement: e.target.checked })
              }
            />
          }
          label={<FormattedMessage defaultMessage="Replacement rule" />}
        />
        {form.isReplacement && (
          <TextField
            label={intl.formatMessage({ defaultMessage: "Destination Value" })}
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={form.destinationValue}
            onChange={(e) =>
              onFormChange({ ...form, destinationValue: e.target.value })
            }
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={
            saving ||
            !form.sourceValue.trim() ||
            (form.isReplacement && !form.destinationValue.trim())
          }
        >
          {saving ? <CircularProgress size={20} /> : <FormattedMessage defaultMessage="Save" />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
