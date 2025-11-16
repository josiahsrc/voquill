import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import {
  createTone,
  getSortedTones,
  setActiveTone,
} from "../../actions/tone.actions";
import { produceAppState, useAppStore } from "../../store";
import { createId } from "../../utils/id.utils";
import { getMyEffectiveUserId } from "../../utils/user.utils";
import { ToneCard } from "./ToneCard";
import { ToneEditor } from "./ToneEditor";

export default function TonesPage() {
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

  const handleCreateTone = useCallback(
    async (name: string, promptTemplate: string) => {
      await createTone({
        id: createId(),
        name,
        promptTemplate,
        sortOrder: tones.length,
      });
    },
    [tones.length]
  );

  const handleSetActive = useCallback(async (toneId: string | null) => {
    await setActiveTone(toneId);
  }, []);

  return (
    <Box sx={{ height: "100%", width: "100%", overflow: "hidden", p: 3 }}>
      <Stack spacing={3} sx={{ height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1">
              <FormattedMessage defaultMessage="Tones" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Choose a tone to customize how Voquill post-processes your transcriptions. Each tone uses a different prompt template to adjust the style of your text." />
            </Typography>
          </Stack>
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
    </Box>
  );
}
