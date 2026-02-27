import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import type { Tone } from "@repo/types";
import { getRec } from "@repo/utilities";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import {
  closeRetranscribeDialog,
  retranscribeTranscription,
} from "../../actions/transcriptions.actions";
import { produceAppState, useAppStore } from "../../store";
import {
  DICTATION_LANGUAGES,
  type DictationLanguageCode,
  ORDERED_DICTATION_LANGUAGES,
} from "../../utils/language.utils";
import { getSortedToneIds } from "../../utils/tone.utils";
import { getMyDictationLanguage } from "../../utils/user.utils";

const languageOptions = ORDERED_DICTATION_LANGUAGES.map((code) => ({
  code,
  label: DICTATION_LANGUAGES[code],
}));

export const RetranscribeDialog = () => {
  const intl = useIntl();

  const open = useAppStore(
    (state) => state.transcriptions.retranscribeDialogOpen,
  );
  const transcriptionId = useAppStore(
    (state) => state.transcriptions.retranscribeDialogTranscriptionId,
  );

  const tones = useAppStore((state) => {
    const toneIds = getSortedToneIds(state);
    return toneIds
      .map((toneId) => getRec(state.toneById, toneId))
      .filter((tone): tone is Tone => tone !== null);
  });

  const defaultLanguage = useAppStore((state) => getMyDictationLanguage(state));

  const [selectedToneId, setSelectedToneId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] =
    useState<string>(defaultLanguage);

  useEffect(() => {
    if (open) {
      setSelectedToneId(tones[0]?.id ?? null);
      setSelectedLanguage(defaultLanguage);
    }
  }, [open, defaultLanguage, tones]);

  const handleSubmit = useCallback(async () => {
    if (!transcriptionId) return;

    closeRetranscribeDialog();

    produceAppState((draft) => {
      if (!draft.transcriptions.retranscribingIds.includes(transcriptionId)) {
        draft.transcriptions.retranscribingIds.push(transcriptionId);
      }
    });

    try {
      await retranscribeTranscription({
        transcriptionId,
        toneId: selectedToneId,
        languageCode: selectedLanguage,
      });
    } catch (error) {
      console.error("Failed to retranscribe audio", error);
      const fallbackMessage = intl.formatMessage({
        defaultMessage: "Unable to retranscribe audio snippet.",
      });
      const message = error instanceof Error ? error.message : fallbackMessage;
      showErrorSnackbar(message || fallbackMessage);
    } finally {
      produceAppState((draft) => {
        draft.transcriptions.retranscribingIds =
          draft.transcriptions.retranscribingIds.filter(
            (id) => id !== transcriptionId,
          );
      });
    }
  }, [transcriptionId, selectedToneId, selectedLanguage, intl]);

  return (
    <Dialog
      open={open}
      onClose={closeRetranscribeDialog}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <FormattedMessage defaultMessage="Retranscribe" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>
              <FormattedMessage defaultMessage="Style" />
            </InputLabel>
            <Select
              label={intl.formatMessage({ defaultMessage: "Style" })}
              value={selectedToneId ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedToneId(value || null);
              }}
            >
              {tones.map((tone) => (
                <MenuItem key={tone.id} value={tone.id}>
                  {tone.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>
              <FormattedMessage defaultMessage="Language" />
            </InputLabel>
            <Select
              label={intl.formatMessage({ defaultMessage: "Language" })}
              value={selectedLanguage}
              onChange={(e) =>
                setSelectedLanguage(e.target.value as DictationLanguageCode)
              }
              MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
            >
              {languageOptions.map(({ code, label }) => (
                <MenuItem key={code} value={code}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeRetranscribeDialog}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          <FormattedMessage defaultMessage="Transcribe" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
