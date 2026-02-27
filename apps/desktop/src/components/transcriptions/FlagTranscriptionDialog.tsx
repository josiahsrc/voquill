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
import { getRec } from "@repo/utilities";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { closeFlagTranscriptionDialog } from "../../actions/transcriptions.actions";
import { useAppStore } from "../../store";
import { AudioPlayerPill } from "./AudioPlayerPill";
import { TranscriptionTextBlock } from "./TranscriptionTextBlock";

const formatModeLabel = (mode: string | null | undefined): React.ReactNode => {
  if (mode === "api") return <FormattedMessage defaultMessage="API" />;
  if (mode === "cloud")
    return <FormattedMessage defaultMessage="Voquill Cloud" />;
  if (mode === "local") return <FormattedMessage defaultMessage="Local" />;
  return <FormattedMessage defaultMessage="Unknown" />;
};

const formatPostProcessModeLabel = (
  mode: string | null | undefined,
): React.ReactNode => {
  if (mode === "api") return <FormattedMessage defaultMessage="API" />;
  if (mode === "cloud")
    return <FormattedMessage defaultMessage="Voquill Cloud" />;
  return <FormattedMessage defaultMessage="Disabled" />;
};

export const FlagTranscriptionDialog = () => {
  const open = useAppStore((state) => state.transcriptions.flagDialogOpen);
  const transcription = useAppStore((state) => {
    const id = state.transcriptions.flagDialogTranscriptionId;
    if (!id) return null;
    return getRec(state.transcriptionById, id);
  });
  const intl = useIntl();
  const [feedback, setFeedback] = useState("");

  const handleClose = useCallback(() => {
    closeFlagTranscriptionDialog();
    setFeedback("");
  }, []);

  const handleSubmit = useCallback(() => {
    // Upload logic deferred — just close for now
    closeFlagTranscriptionDialog();
    setFeedback("");
  }, []);

  const rawTranscriptText = useMemo(
    () => transcription?.rawTranscript ?? transcription?.transcript ?? "",
    [transcription?.rawTranscript, transcription?.transcript],
  );

  const finalTranscriptText = transcription?.transcript ?? "";

  const modelSizeLabel = useMemo(() => {
    const value = transcription?.modelSize?.trim();
    if (!value) return "Unknown";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }, [transcription?.modelSize]);

  const postProcessPrompt = useMemo(() => {
    let prompt = transcription?.postProcessPrompt?.trim() ?? "";
    if (rawTranscriptText) {
      prompt = prompt.replace(rawTranscriptText.trim(), "<transcript>");
    }
    return prompt && prompt.length > 0 ? prompt : null;
  }, [transcription?.postProcessPrompt, rawTranscriptText]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <FormattedMessage defaultMessage="Flag Transcription" />
      </DialogTitle>
      <DialogContent dividers>
        {transcription ? (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Send this transcription to the Voquill team so we can review what went wrong. Your data is only shared with the Voquill team and never with third parties. Adding a note below helps us understand and fix the issue." />
            </Typography>

            {transcription.audio && (
              <AudioPlayerPill
                transcriptionId={transcription.id}
                durationMs={transcription.audio.durationMs}
              />
            )}

            <TextField
              label={intl.formatMessage({
                defaultMessage: "What went wrong?",
              })}
              multiline
              minRows={3}
              maxRows={8}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              fullWidth
            />

            <Stack spacing={1.25}>
              <TranscriptionTextBlock
                label={<FormattedMessage defaultMessage="Raw transcription" />}
                value={rawTranscriptText}
                placeholder={
                  <FormattedMessage defaultMessage="Raw transcript unavailable." />
                }
                monospace
              />
              <TranscriptionTextBlock
                label={
                  <FormattedMessage defaultMessage="Final transcription" />
                }
                value={finalTranscriptText}
                placeholder={
                  <FormattedMessage defaultMessage="Final transcript unavailable." />
                }
                monospace
              />
            </Stack>

            <Box>
              <Typography variant="overline" color="text.secondary">
                <FormattedMessage defaultMessage="Backend Info" />
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="Transcription Mode" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatModeLabel(transcription.transcriptionMode)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="Model Size" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {modelSizeLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="Post-processing Mode" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatPostProcessModeLabel(transcription.postProcessMode)}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <TranscriptionTextBlock
              label={
                <FormattedMessage defaultMessage="Post-processing Prompt" />
              }
              value={postProcessPrompt}
              placeholder={
                <FormattedMessage defaultMessage="No LLM post-processing was applied." />
              }
              monospace
            />
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Transcription not found." />
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!transcription}
        >
          <FormattedMessage defaultMessage="Submit" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
