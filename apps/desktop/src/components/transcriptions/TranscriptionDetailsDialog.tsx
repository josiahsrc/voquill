import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import {
  closeTranscriptionDetailsDialog,
  retranscribeTranscription,
} from "../../actions/transcriptions.actions";
import { AppState } from "../../state/app.state";
import { useAppStore } from "../../store";
import { TranscriptionToneMenu } from "./TranscriptionToneMenu";

const formatModelSizeLabel = (
  modelSize?: string | null,
  unknownLabel: React.ReactNode = "Unknown",
): React.ReactNode => {
  const value = modelSize?.trim();
  if (!value) {
    return unknownLabel;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const renderTextBlock = (
  label: React.ReactNode,
  value: string | null | undefined,
  options?: { placeholder?: React.ReactNode; monospace?: boolean },
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
            bgcolor:
              theme.vars?.palette.level1 ?? theme.palette.background.default,
          })}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: options?.monospace
                ? '"Roboto Mono", monospace'
                : undefined,
            }}
          >
            {normalized}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {options?.placeholder ?? (
            <FormattedMessage defaultMessage="Not provided." />
          )}
        </Typography>
      )}
    </Box>
  );
};

const resolveApiKeyLabel = (
  records: AppState["apiKeyById"],
  apiKeyId: string | null | undefined,
  noneLabel: string,
  unknownLabel: string,
): string => {
  if (!apiKeyId) {
    return noneLabel;
  }

  const record = records[apiKeyId];
  if (!record) {
    return unknownLabel;
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
  const intl = useIntl();
  const [isRetranscribing, setIsRetranscribing] = useState(false);

  const handleClose = useCallback(() => {
    closeTranscriptionDetailsDialog();
  }, []);

  const handleRetranscribe = useCallback(
    async (toneId: string | null) => {
      if (!transcription?.id) {
        showErrorSnackbar(
          intl.formatMessage({
            defaultMessage: "Unable to load transcription details.",
          }),
        );
        return;
      }

      try {
        setIsRetranscribing(true);
        await retranscribeTranscription({
          transcriptionId: transcription.id,
          toneId,
        });
      } catch (error) {
        const fallbackMessage = intl.formatMessage({
          defaultMessage: "Unable to retranscribe audio snippet.",
        });
        const message =
          error instanceof Error ? error.message : fallbackMessage;
        showErrorSnackbar(message || fallbackMessage);
      } finally {
        setIsRetranscribing(false);
      }
    },
    [intl, transcription?.id],
  );

  const transcriptionModeLabel = useMemo(() => {
    if (transcription?.transcriptionMode === "api") {
      return <FormattedMessage defaultMessage="API" />;
    }
    if (transcription?.transcriptionMode === "cloud") {
      return <FormattedMessage defaultMessage="Voquill Cloud" />;
    }
    if (transcription?.transcriptionMode === "local") {
      return <FormattedMessage defaultMessage="Local" />;
    }
    return <FormattedMessage defaultMessage="Unknown" />;
  }, [transcription?.transcriptionMode]);

  const transcriptionApiKeyLabel = useMemo(
    () =>
      resolveApiKeyLabel(
        apiKeysById,
        transcription?.transcriptionApiKeyId,
        "None",
        "Unknown",
      ),
    [apiKeysById, transcription?.transcriptionApiKeyId],
  );

  const postProcessModeLabel = useMemo(() => {
    if (transcription?.postProcessMode === "api") {
      return <FormattedMessage defaultMessage="API" />;
    }
    if (transcription?.postProcessMode === "cloud") {
      return <FormattedMessage defaultMessage="Voquill Cloud" />;
    }
    return <FormattedMessage defaultMessage="Disabled" />;
  }, [transcription?.postProcessDevice, transcription?.postProcessMode]);

  const postProcessApiKeyLabel = useMemo(
    () =>
      resolveApiKeyLabel(
        apiKeysById,
        transcription?.postProcessApiKeyId,
        "None",
        "Unknown",
      ),
    [apiKeysById, transcription?.postProcessApiKeyId],
  );

  const modelSizeLabel = useMemo(
    () => formatModelSizeLabel(transcription?.modelSize ?? null, "Unknown"),
    [transcription?.modelSize],
  );

  const deviceLabel = useMemo(() => {
    const value = transcription?.inferenceDevice?.trim();
    return value && value.length > 0 ? (
      value
    ) : (
      <FormattedMessage defaultMessage="Unknown" />
    );
  }, [transcription?.inferenceDevice]);

  const postProcessDeviceLabel = useMemo(() => {
    const value = transcription?.postProcessDevice?.trim();
    return value && value.length > 0 ? (
      value
    ) : (
      <FormattedMessage defaultMessage="Unknown" />
    );
  }, [transcription?.postProcessDevice]);

  const transcriptionPrompt = useMemo(() => {
    const prompt = transcription?.transcriptionPrompt?.trim();
    return prompt && prompt.length > 0 ? prompt : null;
  }, [transcription?.transcriptionPrompt]);

  const rawTranscriptText = useMemo(
    () => transcription?.rawTranscript ?? transcription?.transcript ?? "",
    [transcription?.rawTranscript, transcription?.transcript],
  );

  const sanitizedTranscriptText = useMemo(
    () => transcription?.sanitizedTranscript ?? null,
    [transcription?.sanitizedTranscript],
  );

  const postProcessPrompt = useMemo(() => {
    let prompt = transcription?.postProcessPrompt?.trim() ?? "";
    if (rawTranscriptText) {
      prompt = prompt.replace(rawTranscriptText.trim(), "<transcript>");
    }

    return prompt && prompt.length > 0 ? prompt : null;
  }, [transcription?.postProcessPrompt, rawTranscriptText]);

  const finalTranscriptText = transcription?.transcript ?? "";

  const transcriptionDurationLabel = useMemo(() => {
    const ms = transcription?.transcriptionDurationMs;
    if (ms == null) return null;
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms}ms`;
  }, [transcription?.transcriptionDurationMs]);

  const postprocessDurationLabel = useMemo(() => {
    const ms = transcription?.postprocessDurationMs;
    if (ms == null) return null;
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms}ms`;
  }, [transcription?.postprocessDurationMs]);

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
      <DialogTitle>
        <FormattedMessage defaultMessage="Transcription Details" />
      </DialogTitle>
      <DialogContent dividers>
        {transcription ? (
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                <FormattedMessage defaultMessage="Outputs" />
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                {renderTextBlock(
                  <FormattedMessage defaultMessage="Raw transcription" />,
                  rawTranscriptText,
                  {
                    placeholder: (
                      <FormattedMessage defaultMessage="Raw transcript unavailable." />
                    ),
                    monospace: true,
                  },
                )}
                {sanitizedTranscriptText &&
                  renderTextBlock(
                    <FormattedMessage defaultMessage="After replacements" />,
                    sanitizedTranscriptText,
                    {
                      monospace: true,
                    },
                  )}
                {renderTextBlock(
                  <FormattedMessage defaultMessage="Final transcription" />,
                  finalTranscriptText,
                  {
                    placeholder: (
                      <FormattedMessage defaultMessage="Final transcript unavailable." />
                    ),
                    monospace: true,
                  },
                )}
              </Stack>
            </Box>

            {warnings.length > 0 && (
              <>
                <Divider />

                <Box>
                  <Typography variant="overline" color="text.secondary">
                    <FormattedMessage defaultMessage="Warnings" />
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {warnings.map((warning, index) => (
                      <Box
                        key={`warning-${index}`}
                        sx={(theme) => ({
                          p: 1,
                          borderRadius: 1,
                          bgcolor:
                            theme.vars?.palette.level1 ??
                            theme.palette.background.default,
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
                    ))}
                  </Stack>
                </Box>
              </>
            )}

            {(transcriptionDurationLabel || postprocessDurationLabel) && (
              <>
                <Divider />

                <Box>
                  <Typography variant="overline" color="text.secondary">
                    <FormattedMessage defaultMessage="Performance" />
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 1 }}>
                    {transcriptionDurationLabel && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          <FormattedMessage defaultMessage="Transcription Duration" />
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {transcriptionDurationLabel}
                        </Typography>
                      </Box>
                    )}
                    {postprocessDurationLabel && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          <FormattedMessage defaultMessage="Post-processing Duration" />
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {postprocessDurationLabel}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </>
            )}

            <Divider />

            <Box>
              <Typography variant="overline" color="text.secondary">
                <FormattedMessage defaultMessage="Transcription Step" />
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="Mode" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {transcriptionModeLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="Device" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {deviceLabel}
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
                    <FormattedMessage defaultMessage="API Key" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {transcriptionApiKeyLabel}
                  </Typography>
                </Box>
                {renderTextBlock(
                  <FormattedMessage defaultMessage="Prompt" />,
                  transcriptionPrompt,
                  {
                    placeholder: (
                      <FormattedMessage defaultMessage="No custom prompt applied." />
                    ),
                    monospace: true,
                  },
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="text.secondary">
                <FormattedMessage defaultMessage="Post-processing Step" />
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="Mode" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {postProcessModeLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="Processor" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {postProcessDeviceLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage defaultMessage="API Key" />
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {postProcessApiKeyLabel}
                  </Typography>
                </Box>
                {renderTextBlock(
                  <FormattedMessage defaultMessage="Prompt" />,
                  postProcessPrompt,
                  {
                    placeholder: (
                      <FormattedMessage defaultMessage="No LLM post-processing was applied." />
                    ),
                    monospace: true,
                  },
                )}
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Metadata unavailable for this transcription." />
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <TranscriptionToneMenu onToneSelect={handleRetranscribe}>
          {({ ref, open }) => (
            <Button
              ref={ref}
              startIcon={<ReplayRoundedIcon />}
              onClick={open}
              disabled={isRetranscribing || !transcription}
            >
              <FormattedMessage defaultMessage="Retranscribe" />
            </Button>
          )}
        </TranscriptionToneMenu>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
