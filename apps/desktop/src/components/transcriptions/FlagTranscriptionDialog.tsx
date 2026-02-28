import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invokeHandler } from "@repo/functions";
import { getRec } from "@repo/utilities";
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import { closeFlagTranscriptionDialog } from "../../actions/transcriptions.actions";
import { getTranscriptionRepo } from "../../repos";
import { useAppStore } from "../../store";
import { buildWaveFile, ensureFloat32Array } from "../../utils/audio.utils";
import { getEffectiveAuth } from "../../utils/auth.utils";
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
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClose = useCallback(() => {
    if (submitting) return;
    closeFlagTranscriptionDialog();
    setFeedback("");
    setProgress(0);
  }, [submitting]);

  const handleSubmit = useCallback(async () => {
    if (!transcription) return;

    const auth = getEffectiveAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setSubmitting(true);
    setProgress(0);

    try {
      const audioPath = `users/${uid}/flaggedAudio/${transcription.id}.wav`;
      let sampleRate: number | null = null;

      if (transcription.audio) {
        const audioData = await getTranscriptionRepo().loadTranscriptionAudio(
          transcription.id,
        );
        sampleRate = audioData.sampleRate;
        const wavBuffer = buildWaveFile(
          ensureFloat32Array(audioData.samples),
          audioData.sampleRate,
        );

        await new Promise<void>((resolve, reject) => {
          const storage = getStorage();
          const fileRef = ref(storage, audioPath);
          const task = uploadBytesResumable(
            fileRef,
            new Uint8Array(wavBuffer),
            { contentType: "audio/wav" },
          );

          task.on(
            "state_changed",
            (snapshot) => {
              const ratio = snapshot.bytesTransferred / snapshot.totalBytes;
              setProgress(ratio * 90);
            },
            reject,
            resolve,
          );
        });
      }

      setProgress(90);

      await invokeHandler("flaggedAudio/upsert", {
        flaggedAudio: {
          id: transcription.id,
          filePath: transcription.audio ? audioPath : "",
          feedback,
          transcriptionPrompt: transcription.transcriptionPrompt ?? null,
          postProcessingPrompt: transcription.postProcessPrompt ?? null,
          rawTranscription:
            transcription.rawTranscript ?? transcription.transcript,
          postProcessedTranscription: transcription.transcript ?? null,
          transcriptionProvider: transcription.transcriptionMode ?? "unknown",
          postProcessingProvider: transcription.postProcessMode ?? null,
          sampleRate,
        },
      });

      setProgress(100);

      showSnackbar(
        intl.formatMessage({
          defaultMessage: "Transcription flagged successfully",
        }),
        { mode: "success" },
      );

      closeFlagTranscriptionDialog();
      setFeedback("");
      setProgress(0);
    } catch (error) {
      showErrorSnackbar(error);
    } finally {
      setSubmitting(false);
    }
  }, [transcription, feedback, intl]);

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
      {submitting && <LinearProgress variant="determinate" value={progress} />}
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!transcription || submitting}
        >
          <FormattedMessage defaultMessage="Submit" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
