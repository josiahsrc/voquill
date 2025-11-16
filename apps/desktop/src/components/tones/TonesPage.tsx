import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { createTone, getSortedTones, resetTonesToDefaults, setActiveTone } from "../../actions/tone.actions";
import { produceAppState, useAppStore } from "../../store";
import { createId } from "../../utils/id.utils";
import { getMyEffectiveUserId } from "../../utils/user.utils";
import { ToneCard } from "./ToneCard";
import { ToneEditor } from "./ToneEditor";

export default function TonesPage() {
  const intl = useIntl();
  const toneById = useAppStore((state) => state.toneById);
  const selectedToneId = useAppStore((state) => state.tones.selectedToneId);
  const isCreating = useAppStore((state) => state.tones.isCreating);
  const activeToneId = useAppStore((state) => {
    const userId = getMyEffectiveUserId(state);
    const activeTone = state.userPreferencesById[userId]?.activeToneId ?? null;
    console.log("[TonesPage] Active tone from preferences:", {
      userId,
      activeToneId: activeTone,
      hasPrefs: !!state.userPreferencesById[userId],
      allPrefs: state.userPreferencesById[userId],
    });
    return activeTone;
  });

  const tones = getSortedTones();
  const selectedTone = selectedToneId ? toneById[selectedToneId] : null;
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const resetLabel = intl.formatMessage({ defaultMessage: "Reset to defaults" });

  console.log("[TonesPage] Render:", {
    tonesCount: tones.length,
    activeToneId,
    selectedToneId,
    toneByIdKeys: Object.keys(toneById),
  });

  const handleSelectTone = useCallback((toneId: string) => {
    produceAppState((draft) => {
      draft.tones.selectedToneId = toneId;
      draft.tones.isCreating = false;
    });
  }, []);

  const handleStartCreating = useCallback(() => {
    produceAppState((draft) => {
      draft.tones.isCreating = true;
      draft.tones.selectedToneId = null;
    });
  }, []);

  const handleCancelCreating = useCallback(() => {
    produceAppState((draft) => {
      draft.tones.isCreating = false;
    });
  }, []);

  const handleCreateTone = useCallback(async (name: string, promptTemplate: string) => {
    await createTone({
      id: createId(),
      name,
      promptTemplate,
      sortOrder: tones.length,
    });
  }, [tones.length]);

  const handleSetActive = useCallback(async (toneId: string | null) => {
    await setActiveTone(toneId);
  }, []);

  const handleOpenResetDialog = useCallback(() => {
    setIsResetDialogOpen(true);
  }, []);

  const handleCloseResetDialog = useCallback(() => {
    if (!isResetting) {
      setIsResetDialogOpen(false);
    }
  }, [isResetting]);

  const handleConfirmReset = useCallback(async () => {
    if (isResetting) {
      return;
    }

    setIsResetting(true);
    try {
      await resetTonesToDefaults();
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  }, [isResetting, resetTonesToDefaults]);

  return (
    <Box sx={{ height: "100%", width: "100%", overflow: "hidden", p: 3 }}>
      <Stack spacing={3} sx={{ height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1">
              <FormattedMessage defaultMessage="Tones" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Choose a tone to customize how Voquill post-processes your transcriptions. Each tone uses a different prompt template to adjust the style of your text." />
            </Typography>
          </Stack>

          <Tooltip title={resetLabel}>
            <span>
              <IconButton
                aria-label={resetLabel}
                onClick={handleOpenResetDialog}
                disabled={isResetting}
                size="small"
                sx={{ flexShrink: 0, color: "text.secondary" }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Main content */}
        <Box sx={{ display: "flex", gap: 3, flex: 1, overflow: "hidden" }}>
          {/* Tone list */}
          <Stack
            spacing={2}
            sx={{
              width: 320,
              flexShrink: 0,
              overflowY: "auto",
              pr: 1,
            }}
          >
            <Button
              variant="text"
              startIcon={<AddRoundedIcon />}
              onClick={handleStartCreating}
              fullWidth
              sx={{ justifyContent: "flex-start" }}
            >
              <FormattedMessage defaultMessage="Create tone" />
            </Button>

            {tones.map((tone) => (
              <ToneCard
                key={tone.id}
                tone={tone}
                isSelected={tone.id === selectedToneId}
                isActive={tone.id === activeToneId}
                onSelect={() => handleSelectTone(tone.id)}
                onSetActive={() => handleSetActive(tone.id)}
              />
            ))}
          </Stack>

          {/* Editor */}
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            {isCreating ? (
              <ToneEditor
                mode="create"
                onSave={handleCreateTone}
                onCancel={handleCancelCreating}
              />
            ) : selectedTone ? (
              <ToneEditor
                key={selectedTone.id}
                mode="edit"
                tone={selectedTone}
                isActive={selectedTone.id === activeToneId}
                onSetActive={() => handleSetActive(selectedTone.id)}
              />
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2">
                  <FormattedMessage defaultMessage="Select a tone to view and edit its prompt template" />
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Stack>

      <Dialog open={isResetDialogOpen} onClose={handleCloseResetDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          <FormattedMessage defaultMessage="Reset tones?" />
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage defaultMessage="Resetting tones will delete all custom tones. This action cannot be undone. Continue?" />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog} disabled={isResetting}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button
            onClick={handleConfirmReset}
            color="error"
            disabled={isResetting}
            autoFocus
          >
            <FormattedMessage defaultMessage="Reset" />
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
