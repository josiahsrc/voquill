import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { Tone } from "@repo/types";
import { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { deleteTone, updateTone } from "../../actions/tone.actions";

type ToneEditorProps =
  | {
      mode: "create";
      onSave: (name: string, promptTemplate: string) => Promise<void>;
      onCancel: () => void;
    }
  | {
      mode: "edit";
      tone: Tone;
      isActive: boolean;
      onSetActive: () => void;
    };

export function ToneEditor(props: ToneEditorProps) {
  const isEditMode = props.mode === "edit";
  const initialName = isEditMode ? props.tone.name : "";
  const initialPrompt = isEditMode ? props.tone.promptTemplate : "";

  const [name, setName] = useState(initialName);
  const [promptTemplate, setPromptTemplate] = useState(initialPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges =
    isEditMode &&
    (name !== props.tone.name || promptTemplate !== props.tone.promptTemplate);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !promptTemplate.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      if (props.mode === "create") {
        await props.onSave(name.trim(), promptTemplate.trim());
      } else {
        await updateTone({
          ...props.tone,
          name: name.trim(),
          promptTemplate: promptTemplate.trim(),
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [name, promptTemplate, props]);

  const handleDelete = useCallback(async () => {
    if (props.mode !== "edit" || !confirm("Are you sure you want to delete this tone?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTone(props.tone.id);
    } finally {
      setIsDeleting(false);
    }
  }, [props]);

  const handleCancel = useCallback(() => {
    if (props.mode === "create") {
      props.onCancel();
    } else {
      // Reset to original values
      setName(props.tone.name);
      setPromptTemplate(props.tone.promptTemplate);
    }
  }, [props]);

  return (
    <Stack spacing={3} sx={{ height: "100%", overflow: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {isEditMode ? (
            <FormattedMessage defaultMessage="Edit tone" />
          ) : (
            <FormattedMessage defaultMessage="Create tone" />
          )}
        </Typography>

        {isEditMode && (
          <Tooltip title={<FormattedMessage defaultMessage="Delete tone" />}>
            <span>
              <IconButton
                onClick={handleDelete}
                disabled={isDeleting}
                color="error"
                size="small"
              >
                <DeleteOutlineIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* Name field */}
      <TextField
        label={<FormattedMessage defaultMessage="Name" />}
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        placeholder="Casual, Formal, Business..."
      />

      {/* Prompt template field */}
      <TextField
        label={<FormattedMessage defaultMessage="Prompt template" />}
        value={promptTemplate}
        onChange={(e) => setPromptTemplate(e.target.value)}
        multiline
        rows={12}
        fullWidth
        placeholder="You are Voquill. Transform the transcript below..."
        helperText={
          <FormattedMessage defaultMessage="This template will be sent to the LLM for post-processing. Include clear instructions and use {transcript} to reference the raw transcription." />
        }
      />

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        {(props.mode === "create" || hasChanges) && (
          <Button variant="text" onClick={handleCancel}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
        )}

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={
            isSaving || !name.trim() || !promptTemplate.trim() || (isEditMode && !hasChanges)
          }
        >
          {props.mode === "create" ? (
            <FormattedMessage defaultMessage="Create" />
          ) : (
            <FormattedMessage defaultMessage="Save changes" />
          )}
        </Button>
      </Box>
    </Stack>
  );
}
