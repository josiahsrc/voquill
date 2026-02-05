import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
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
  const [promptFocused, setPromptFocused] = useState(false);

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
          placeholder={intl.formatMessage({
            defaultMessage: "Customer Support",
          })}
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        />
        <Box sx={{ position: "relative" }}>
          <TextField
            label={intl.formatMessage({ defaultMessage: "Prompt" })}
            fullWidth
            size="small"
            multiline
            minRows={4}
            value={form.promptTemplate}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            onChange={(e) =>
              onFormChange({ ...form, promptTemplate: e.target.value })
            }
          />
          {!form.promptTemplate && promptFocused && (
            <Typography
              sx={{
                position: "absolute",
                top: "9px",
                left: "14px",
                pointerEvents: "none",
                color: "text.disabled",
                fontSize: "0.875rem",
                whiteSpace: "pre-line",
              }}
            >
              <FormattedMessage
                defaultMessage="- Use a warm, helpful tone{br}- Address the customer's concern directly{br}..."
                values={{ br: "\n" }}
              />
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.promptTemplate.trim()}
        >
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
