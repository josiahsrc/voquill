import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
  isTemplateTone: boolean;
  systemPromptTemplate: string;
};

const EMPTY_FORM: ToneFormState = {
  id: "",
  name: "",
  promptTemplate: "",
  isTemplateTone: false,
  systemPromptTemplate: "",
};

export function formFromTone(tone: Tone): ToneFormState {
  return {
    id: tone.id,
    name: tone.name,
    promptTemplate: tone.promptTemplate,
    isTemplateTone: tone.isTemplateTone ?? false,
    systemPromptTemplate: tone.systemPromptTemplate ?? "",
  };
}

export function emptyForm(): ToneFormState {
  return {
    ...EMPTY_FORM,
    id: crypto.randomUUID(),
    isTemplateTone: false,
    systemPromptTemplate: "",
  };
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
        isTemplateTone: form.isTemplateTone,
        systemPromptTemplate: form.isTemplateTone
          ? form.systemPromptTemplate
          : "",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(toneById[form.id]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {isEdit ? (
          <FormattedMessage defaultMessage="Edit Style" />
        ) : (
          <FormattedMessage defaultMessage="Add Style" />
        )}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={form.isTemplateTone ? "template" : "style"}
          onChange={(_, value) => {
            if (value) {
              onFormChange({ ...form, isTemplateTone: value === "template" });
            }
          }}
        >
          <ToggleButton value="style">
            <FormattedMessage defaultMessage="Style" />
          </ToggleButton>
          <ToggleButton value="template">
            <FormattedMessage defaultMessage="Template" />
          </ToggleButton>
        </ToggleButtonGroup>
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
          autoComplete="off"
          value={form.name}
          onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        />
        {form.isTemplateTone && (
          <TextField
            label={intl.formatMessage({
              defaultMessage: "System Prompt",
            })}
            placeholder={intl.formatMessage({
              defaultMessage:
                "You are a helpful assistant that rewrites transcripts",
            })}
            fullWidth
            size="small"
            autoComplete="off"
            multiline
            minRows={4}
            value={form.systemPromptTemplate}
            onChange={(e) =>
              onFormChange({
                ...form,
                systemPromptTemplate: e.target.value,
              })
            }
          />
        )}
        <Box sx={{ position: "relative" }}>
          <TextField
            label={
              form.isTemplateTone ? (
                <FormattedMessage defaultMessage="Prompt Template" />
              ) : (
                <FormattedMessage defaultMessage="Prompt" />
              )
            }
            fullWidth
            size="small"
            autoComplete="off"
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
              {form.isTemplateTone ? (
                <FormattedMessage
                  defaultMessage="Rewrite <transcript/> for <username/> in <language/>.{br}Keep the tone professional."
                  values={{ br: "\n" }}
                />
              ) : (
                <FormattedMessage
                  defaultMessage="- Use a warm, helpful tone{br}- Address the customer's concern directly{br}..."
                  values={{ br: "\n" }}
                />
              )}
            </Typography>
          )}
        </Box>
        {form.isTemplateTone && (
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage
              defaultMessage="Available variables: {username}, {transcript}, {language}. These will be replaced with the actual values at runtime. The prompt must instruct the model to respond in JSON format."
              values={{
                username: "<username/>",
                transcript: "<transcript/>",
                language: "<language/>",
              }}
            />
          </Typography>
        )}
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
