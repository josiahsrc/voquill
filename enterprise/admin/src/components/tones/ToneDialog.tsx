import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import type { Tone } from "@repo/types";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { upsertGlobalTone } from "../../actions/tones.actions";
import { useAppStore } from "../../store";

type ToneFormState = {
  id: string;
  name: string;
  promptTemplate: string;
};

const EMPTY_FORM: ToneFormState = {
  id: "",
  name: "",
  promptTemplate: "",
};

export function formFromTone(tone: Tone): ToneFormState {
  return {
    id: tone.id,
    name: tone.name,
    promptTemplate: tone.promptTemplate,
  };
}

export function emptyForm(): ToneFormState {
  return { ...EMPTY_FORM, id: crypto.randomUUID() };
}

export type ToneDialogProps = {
  open: boolean;
  form: ToneFormState;
  onFormChange: (form: ToneFormState) => void;
  onClose: () => void;
};

export const ToneDialog = ({
  open,
  form,
  onFormChange,
  onClose,
}: ToneDialogProps) => {
  const intl = useIntl();
  const toneById = useAppStore((state) => state.toneById);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = toneById[form.id];
      await upsertGlobalTone({
        id: form.id,
        name: form.name,
        promptTemplate: form.promptTemplate,
        isSystem: false,
        createdAt: existing?.createdAt ?? Date.now(),
        sortOrder: existing?.sortOrder ?? 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(toneById[form.id]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? (
          <FormattedMessage defaultMessage="Edit Style" />
        ) : (
          <FormattedMessage defaultMessage="Add Style" />
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
          label={intl.formatMessage({ defaultMessage: "Prompt Template" })}
          fullWidth
          size="small"
          multiline
          minRows={4}
          value={form.promptTemplate}
          onChange={(e) =>
            onFormChange({ ...form, promptTemplate: e.target.value })
          }
          helperText={intl.formatMessage({
            defaultMessage: "Use {transcript} as a placeholder for the input text.",
          })}
        />
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
            !form.name.trim() ||
            !form.promptTemplate.trim()
          }
        >
          {saving ? <CircularProgress size={20} /> : <FormattedMessage defaultMessage="Save" />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
