import {
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback, useMemo } from "react";
import { closeTranscriptionDetailsDialog } from "../../actions/transcriptions.actions";
import { AppState } from "../../state/app.state";
import { useAppStore } from "../../store";

const formatModelSizeLabel = (modelSize?: string | null): string => {
  const value = modelSize?.trim();
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const renderTextBlock = (
  label: string,
  value: string | null | undefined,
  options?: { placeholder?: string; monospace?: boolean }
) => {
  const normalized = value?.trim();

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {normalized ? (
        <Box
          sx={(theme) => ({
            mt: 0.5,
            p: 1,
            borderRadius: 1,
            bgcolor: theme.vars?.palette.level1 ?? theme.palette.background.default,
          })}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: options?.monospace ? '"Roboto Mono", monospace' : undefined,
            }}
          >
            {normalized}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {options?.placeholder ?? "Not provided."}
        </Typography>
      )}
    </Box>
  );
};

const resolveApiKeyLabel = (records: AppState["apiKeyById"], apiKeyId?: string | null): string => {
  if (!apiKeyId) {
    return "None";
  }

  const record = records[apiKeyId];
  if (!record) {
    return "Unknown";
  }

  const suffix = record.keySuffix?.trim();
  if (suffix && suffix.length > 0) {
    return `${record.name} (••••${suffix})`;
  }

  return record.name;
};

export const TranscriptionDetailsDialog = () => {
  const open = useAppStore((state) => state.transcriptions.detailsDialogOpen);
  const transcription = useAppStore((state) => {
    const transcriptionId = state.transcriptions.detailsDialogTranscriptionId;
    if (!transcriptionId) {
      return null;
    }
    return getRec(state.transcriptionById, transcriptionId);
  });
  const apiKeysById = useAppStore((state) => state.apiKeyById);

  const handleClose = useCallback(() => {
    closeTranscriptionDetailsDialog();
  }, []);

  const transcriptionModeLabel = useMemo(() => {
    if (transcription?.transcriptionMode === "api") {
      return "API";
    }
    if (transcription?.transcriptionMode === "cloud") {
      return "Voquill Cloud";
    }
    if (transcription?.transcriptionMode === "local") {
      return "Local";
    }
    return "Unknown";
  }, [transcription?.transcriptionMode]);

  const transcriptionApiKeyLabel = useMemo(
    () => resolveApiKeyLabel(apiKeysById, transcription?.transcriptionApiKeyId),
    [apiKeysById, transcription?.transcriptionApiKeyId]
  );

  const postProcessModeLabel = useMemo(() => {
    if (transcription?.postProcessMode === "api") {
      return "API";
    }
    if (transcription?.postProcessMode === "cloud") {
      return "Voquill Cloud";
    }
    return "Disabled";
  }, [transcription?.postProcessDevice, transcription?.postProcessMode]);

  const postProcessApiKeyLabel = useMemo(
    () => resolveApiKeyLabel(apiKeysById, transcription?.postProcessApiKeyId),
    [apiKeysById, transcription?.postProcessApiKeyId]
  );

  const modelSizeLabel = useMemo(
    () => formatModelSizeLabel(transcription?.modelSize ?? null),
    [transcription?.modelSize]
  );

  const deviceLabel = useMemo(() => {
    const value = transcription?.inferenceDevice?.trim();
    return value && value.length > 0 ? value : "Unknown";
  }, [transcription?.inferenceDevice]);

  const postProcessDeviceLabel = useMemo(() => {
    const value = transcription?.postProcessDevice?.trim();
    return value && value.length > 0 ? value : "Unknown";
  }, [transcription?.postProcessDevice]);

  const transcriptionPrompt = useMemo(() => {
    const prompt = transcription?.transcriptionPrompt?.trim();
    return prompt && prompt.length > 0 ? prompt : null;
  }, [transcription?.transcriptionPrompt]);

  const postProcessPrompt = useMemo(() => {
    const prompt = transcription?.postProcessPrompt?.trim();
    return prompt && prompt.length > 0 ? prompt : null;
  }, [transcription?.postProcessPrompt]);

  const rawTranscriptText = useMemo(
    () => transcription?.rawTranscript ?? transcription?.transcript ?? "",
    [transcription?.rawTranscript, transcription?.transcript]
  );

  const finalTranscriptText = transcription?.transcript ?? "";
  const warnings = useMemo(() => {
    if (!transcription?.warnings) {
      return [];
    }
    return transcription.warnings
      .map((warning) => warning.trim())
      .filter((warning) => warning.length > 0);
  }, [transcription?.warnings]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Transcription Details</DialogTitle>
      <DialogContent dividers>
        {transcription ? (
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Transcription Step
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Mode
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {transcriptionModeLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Device
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {deviceLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Model Size
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {modelSizeLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    API Key
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {transcriptionApiKeyLabel}
                  </Typography>
                </Box>
                {renderTextBlock("Prompt", transcriptionPrompt, {
                  placeholder: "No custom prompt applied.",
                  monospace: true,
                })}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="text.secondary">
                Post-processing Step
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Mode
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {postProcessModeLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Processor
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {postProcessDeviceLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    API Key
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {postProcessApiKeyLabel}
                  </Typography>
                </Box>
                {renderTextBlock("Prompt", postProcessPrompt, {
                  placeholder: "No LLM post-processing was applied.",
                  monospace: true,
                })}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="text.secondary">
                Outputs
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                {renderTextBlock("Raw transcription", rawTranscriptText, {
                  placeholder: "Raw transcript unavailable.",
                  monospace: true,
                })}
                {renderTextBlock("Final transcription", finalTranscriptText, {
                  placeholder: "Final transcript unavailable.",
                  monospace: true,
                })}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="text.secondary">
                Warnings
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {warnings.length > 0 ? (
                  warnings.map((warning, index) => (
                    <Box
                      key={`warning-${index}`}
                      sx={(theme) => ({
                        p: 1,
                        borderRadius: 1,
                        bgcolor:
                          theme.vars?.palette.level1 ?? theme.palette.background.default,
                      })}
                    >
                      <Typography
                        variant="body2"
                        sx={(theme) => ({
                          color:
                            theme.vars?.palette.warning?.main ??
                            theme.palette.warning.main,
                        })}
                      >
                        {warning}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No warnings recorded for this transcription.
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Metadata unavailable for this transcription.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
