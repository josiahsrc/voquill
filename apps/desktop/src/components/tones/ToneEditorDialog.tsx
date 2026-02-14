import { DeleteForeverOutlined } from "@mui/icons-material";
import SaveIcon from "@mui/icons-material/Save";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PROMPT_LIMIT, Tone } from "@repo/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { setAppTargetTone } from "../../actions/app-target.actions";
import {
  closeToneEditorDialog,
  deleteTone,
  upsertTone,
} from "../../actions/tone.actions";
import { useAppStore } from "../../store";
import { createId } from "../../utils/id.utils";
import { ConfirmDialog } from "../common/ConfirmDialog";

const MAX_PROMPT_LEN = PROMPT_LIMIT;

export const ToneEditorDialog = () => {
  const toneEditor = useAppStore((state) => state.toneEditor);
  const toneById = useAppStore((state) => state.toneById);

  const tones = useMemo(
    () =>
      Object.values(toneById).sort(
        (left, right) => left.sortOrder - right.sortOrder,
      ),
    [toneById],
  );

  const editingTone: Tone | null = toneEditor.toneId
    ? (toneById[toneEditor.toneId] ?? null)
    : null;

  const handleClose = useCallback(() => {
    closeToneEditorDialog();
  }, []);

  const handleCreate = useCallback(
    async (name: string, promptTemplate: string) => {
      const nextSortOrder =
        tones.length > 0 ? tones[tones.length - 1].sortOrder + 1 : 0;

      const newTone: Tone = {
        id: createId(),
        name,
        promptTemplate,
        isSystem: false,
        createdAt: Date.now(),
        sortOrder: nextSortOrder,
      };

      await upsertTone(newTone);

      if (toneEditor.targetId) {
        await setAppTargetTone(toneEditor.targetId, newTone.id);
      }
    },
    [tones, toneEditor.targetId],
  );

  const handleEditSave = useCallback(async (toneToSave: Tone) => {
    await upsertTone(toneToSave);
  }, []);

  const handleDelete = useCallback(async (toneId: string) => {
    await deleteTone(toneId);
  }, []);

  const isEditMode = toneEditor.mode === "edit" && !!editingTone;
  const tone = isEditMode && editingTone ? editingTone : null;
  const [name, setName] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isEditMode && tone) {
      setName(tone.name);
      setPromptTemplate(tone.promptTemplate);
    } else if (toneEditor.mode === "create") {
      setName("");
      setPromptTemplate("");
    }
  }, [isEditMode, tone, toneEditor.mode, toneEditor.open]);

  useEffect(() => {
    if (!toneEditor.open) {
      setIsConfirmOpen(false);
    }
  }, [toneEditor.open]);

  const hasChanges =
    isEditMode &&
    tone &&
    (name !== tone.name || promptTemplate !== tone.promptTemplate);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedPrompt = promptTemplate.trim();

    if (!trimmedName || !trimmedPrompt) {
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && tone) {
        await handleEditSave({
          ...tone,
          name: trimmedName,
          promptTemplate: trimmedPrompt,
        });
      } else {
        await handleCreate(trimmedName, trimmedPrompt);
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    promptTemplate,
    isEditMode,
    tone,
    handleEditSave,
    handleCreate,
    handleClose,
  ]);

  const handleDeleteTone = useCallback(async () => {
    if (!isEditMode || !tone) {
      return;
    }

    setIsConfirmOpen(false);
    setIsDeleting(true);
    try {
      await handleDelete(tone.id);
      handleClose();
    } finally {
      setIsDeleting(false);
    }
  }, [isEditMode, tone, handleDelete, handleClose]);

  const handleOpenDeleteConfirm = useCallback(() => {
    if (!isEditMode || !tone || tone.isSystem) {
      return;
    }

    setIsConfirmOpen(true);
  }, [isEditMode, tone]);

  const handleCancelDelete = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (isEditMode && tone) {
      setName(tone.name);
      setPromptTemplate(tone.promptTemplate);
    }
    handleClose();
  }, [isEditMode, tone, handleClose]);

  const title = useMemo(
    () =>
      isEditMode ? (
        <FormattedMessage defaultMessage="Edit style" />
      ) : (
        <FormattedMessage defaultMessage="Create style" />
      ),
    [isEditMode],
  );

  return (
    <>
      <Dialog
        open={toneEditor.open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {title}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Stack
            spacing={3}
            sx={{ height: "100%", overflow: "auto", minHeight: 320, pt: 1 }}
          >
            <TextField
              label={<FormattedMessage defaultMessage="Name" />}
              value={name}
              onChange={(event) => setName(event.target.value)}
              fullWidth
              placeholder="Casual, Formal, Business..."
              inputProps={{ maxLength: 120 }}
            />

            <TextField
              label={<FormattedMessage defaultMessage="Prompt" />}
              value={promptTemplate}
              onChange={(event) => setPromptTemplate(event.target.value)}
              multiline
              rows={7}
              fullWidth
              placeholder="Make it sound like a professional but friendly email. Use jargon and fun words."
              inputProps={{ maxLength: MAX_PROMPT_LEN }}
              helperText={
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  {promptTemplate.length}/{MAX_PROMPT_LEN}
                </Typography>
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {isEditMode && (
            <Button
              variant="text"
              onClick={handleOpenDeleteConfirm}
              disabled={isDeleting}
              color="warning"
              sx={{ mr: "auto" }}
              startIcon={<DeleteForeverOutlined />}
            >
              <FormattedMessage defaultMessage="Delete" />
            </Button>
          )}
          <Button variant="text" onClick={handleCancel}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={
              isSaving ||
              !name.trim() ||
              !promptTemplate.trim() ||
              (isEditMode && !hasChanges)
            }
          >
            {isEditMode ? (
              <FormattedMessage defaultMessage="Save changes" />
            ) : (
              <FormattedMessage defaultMessage="Create" />
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={<FormattedMessage defaultMessage="Delete style" />}
        content={
          <FormattedMessage defaultMessage="Are you sure you want to delete this style?" />
        }
        onCancel={handleCancelDelete}
        onConfirm={handleDeleteTone}
        confirmLabel={<FormattedMessage defaultMessage="Delete" />}
        confirmButtonProps={{ color: "error", disabled: isDeleting }}
      />
    </>
  );
};
