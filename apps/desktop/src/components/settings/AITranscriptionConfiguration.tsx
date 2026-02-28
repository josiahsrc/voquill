import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  deleteLocalTranscriptionModel,
  downloadLocalTranscriptionModel,
  refreshLocalTranscriptionModelStatuses,
} from "../../actions/settings-local-transcription.actions";
import { showErrorSnackbar } from "../../actions/app.actions";
import {
  setPreferredTranscriptionApiKeyId,
  setPreferredTranscriptionDevice,
  setPreferredTranscriptionMode,
  setPreferredTranscriptionModelSize,
} from "../../actions/user.actions";
import {
  isLocalTranscriptionModelDownloadInProgress,
  isLocalTranscriptionModelSelectable,
} from "../../state/settings.state";
import { useAppStore } from "../../store";
import { CPU_DEVICE_VALUE, type TranscriptionMode } from "../../types/ai.types";
import { getAllowsChangeTranscription } from "../../utils/enterprise.utils";
import { formatSize } from "../../utils/format.utils";
import { type LocalSidecarDownloadSnapshot } from "../../utils/local-transcription-sidecar.utils";
import {
  isGpuPreferredTranscriptionDevice,
  supportsGpuTranscriptionDevice,
  type LocalWhisperModel,
  normalizeLocalWhisperModel,
} from "../../utils/local-transcription.utils";
import { ManagedByOrgNotice } from "../common/ManagedByOrgNotice";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../common/SegmentedControl";
import { maybeArrayElements } from "./AIPostProcessingConfiguration";
import { ApiKeyList } from "./ApiKeyList";
import { VoquillCloudSetting } from "./VoquillCloudSetting";

type ModelOption = {
  value: LocalWhisperModel;
  label: string;
  helper: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  { value: "tiny", label: "Tiny (77 MB)", helper: "Fastest, lowest accuracy" },
  {
    value: "base",
    label: "Base (148 MB)",
    helper: "Great balance of speed and accuracy",
  },
  {
    value: "small",
    label: "Small (488 MB)",
    helper: "Recommended with GPU acceleration",
  },
  {
    value: "medium",
    label: "Medium (1.53 GB)",
    helper: "Balanced quality and speed",
  },
  {
    value: "turbo",
    label: "Large Turbo (1.6 GB)",
    helper: "Fast large model, great accuracy",
  },
  {
    value: "large",
    label: "Large (3.1 GB)",
    helper: "Highest accuracy, requires GPU",
  },
];

const formatDownloadProgress = (
  snapshot: LocalSidecarDownloadSnapshot | undefined,
): string | null => {
  if (!snapshot) {
    return null;
  }

  const progressPart =
    snapshot.progress != null
      ? `${Math.round(Math.max(0, Math.min(1, snapshot.progress)) * 100)}%`
      : null;

  const bytesPart =
    snapshot.totalBytes != null && snapshot.totalBytes > 0
      ? `${formatSize(snapshot.bytesDownloaded)} of ${formatSize(snapshot.totalBytes)}`
      : snapshot.bytesDownloaded > 0
        ? formatSize(snapshot.bytesDownloaded)
        : null;

  if (progressPart && bytesPart) {
    return `${progressPart} • ${bytesPart}`;
  }

  return progressPart || bytesPart;
};

export type AITranscriptionConfigurationProps = {
  hideCloudOption?: boolean;
};

export const AITranscriptionConfiguration = ({
  hideCloudOption,
}: AITranscriptionConfigurationProps) => {
  const intl = useIntl();
  const transcription = useAppStore((state) => state.settings.aiTranscription);
  const allowChange = useAppStore(getAllowsChangeTranscription);
  const localTranscriptionConfig = transcription.localModelManagement;

  const preferGpu = isGpuPreferredTranscriptionDevice(transcription.device);
  const supportsGpuDevice = supportsGpuTranscriptionDevice();
  const deviceValue = preferGpu ? "gpu" : CPU_DEVICE_VALUE;
  const modelValue = normalizeLocalWhisperModel(transcription.modelSize);
  const modelDownloadSnapshot =
    localTranscriptionConfig.modelDownloads[modelValue];
  const modelDownloading = isLocalTranscriptionModelDownloadInProgress(
    modelDownloadSnapshot,
  );
  const modelSelectable = isLocalTranscriptionModelSelectable(
    transcription,
    modelValue,
  );
  const showInlineModelDownloadAction = !modelSelectable;

  useEffect(() => {
    if (transcription.mode !== "local") {
      return;
    }

    void refreshLocalTranscriptionModelStatuses();
  }, [transcription.mode, transcription.device]);

  useEffect(() => {
    if (
      transcription.mode !== "local" ||
      !localTranscriptionConfig.modelStatusesLoaded
    ) {
      return;
    }

    if (isLocalTranscriptionModelSelectable(transcription, modelValue)) {
      return;
    }

    const fallbackModel = MODEL_OPTIONS.find((option) =>
      isLocalTranscriptionModelSelectable(transcription, option.value),
    )?.value;

    if (!fallbackModel || fallbackModel === modelValue) {
      return;
    }

    void setPreferredTranscriptionModelSize(fallbackModel);
  }, [
    transcription,
    localTranscriptionConfig.modelStatusesLoaded,
    modelValue,
    transcription.mode,
  ]);

  const handleModeChange = useCallback((mode: TranscriptionMode) => {
    void setPreferredTranscriptionMode(mode);
  }, []);

  const handleDeviceChange = useCallback((device: string) => {
    void setPreferredTranscriptionDevice(device);
  }, []);

  const handleModelSizeChange = useCallback(
    (rawModelSize: string) => {
      const modelSize = normalizeLocalWhisperModel(rawModelSize);
      if (!isLocalTranscriptionModelSelectable(transcription, modelSize)) {
        showErrorSnackbar("Download this model before selecting it.");
        return;
      }

      void setPreferredTranscriptionModelSize(modelSize);
    },
    [transcription],
  );

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredTranscriptionApiKeyId(id);
  }, []);

  const handleDownloadModel = useCallback(
    (model: LocalWhisperModel) => {
      if (
        isLocalTranscriptionModelDownloadInProgress(
          localTranscriptionConfig.modelDownloads[model],
        )
      ) {
        return;
      }

      void downloadLocalTranscriptionModel(model);
    },
    [localTranscriptionConfig.modelDownloads],
  );

  const handleDeleteModel = useCallback(
    (model: LocalWhisperModel) => {
      if (localTranscriptionConfig.modelDeletes[model]) {
        return;
      }

      void (async () => {
        const statuses = await deleteLocalTranscriptionModel(model);
        if (modelValue !== model || !statuses) {
          return;
        }

        const fallbackModel = MODEL_OPTIONS.find(
          (option) =>
            statuses[option.value]?.downloaded && statuses[option.value]?.valid,
        )?.value;

        if (fallbackModel) {
          await setPreferredTranscriptionModelSize(fallbackModel);
        }
      })();
    },
    [localTranscriptionConfig.modelDeletes, modelValue],
  );

  if (!allowChange) {
    return <ManagedByOrgNotice />;
  }

  return (
    <Stack spacing={3} alignItems="flex-start" sx={{ width: "100%" }}>
      <SegmentedControl<TranscriptionMode>
        value={transcription.mode}
        onChange={handleModeChange}
        options={[
          ...maybeArrayElements<SegmentedControlOption<TranscriptionMode>>(
            !hideCloudOption,
            [
              {
                value: "cloud",
                label: "Voquill",
              },
            ],
          ),
          { value: "api", label: "API" },
          { value: "local", label: "Local" },
        ]}
        ariaLabel="Processing mode"
      />

      {transcription.mode === "local" && (
        <Stack spacing={3} sx={{ width: "100%" }}>
          {supportsGpuDevice && (
            <FormControl fullWidth size="small" sx={{ position: "relative" }}>
              <InputLabel id="processing-device-label">
                <FormattedMessage defaultMessage="Processing device" />
              </InputLabel>
              <Select
                labelId="processing-device-label"
                label={<FormattedMessage defaultMessage="Processing device" />}
                value={deviceValue}
                onChange={(event) => handleDeviceChange(event.target.value)}
              >
                <MenuItem value={CPU_DEVICE_VALUE}>
                  <FormattedMessage defaultMessage="CPU processing" />
                </MenuItem>
                <MenuItem value="gpu">
                  <FormattedMessage defaultMessage="GPU acceleration (auto fallback)" />
                </MenuItem>
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth size="small">
            <InputLabel id="model-size-label">
              <FormattedMessage defaultMessage="Model size" />
            </InputLabel>
            <Select
              labelId="model-size-label"
              label={<FormattedMessage defaultMessage="Model size" />}
              value={modelValue}
              onChange={(event) =>
                handleModelSizeChange(String(event.target.value))
              }
              renderValue={(value) => {
                const model = normalizeLocalWhisperModel(String(value));
                const option = MODEL_OPTIONS.find(
                  (item) => item.value === model,
                );
                const suffix = isLocalTranscriptionModelSelectable(
                  transcription,
                  model,
                )
                  ? ""
                  : ` • ${intl.formatMessage({ defaultMessage: "Not downloaded" })}`;
                return `${option?.label ?? model}${suffix}`;
              }}
              sx={
                showInlineModelDownloadAction
                  ? {
                      "& .MuiSelect-select": {
                        pr: "132px !important",
                      },
                    }
                  : undefined
              }
            >
              {MODEL_OPTIONS.map(({ value, label, helper }) => {
                const status = localTranscriptionConfig.modelStatuses[value];
                const downloadSnapshot =
                  localTranscriptionConfig.modelDownloads[value];
                const downloading =
                  isLocalTranscriptionModelDownloadInProgress(downloadSnapshot);
                const deleting = !!localTranscriptionConfig.modelDeletes[value];
                const selectable = isLocalTranscriptionModelSelectable(
                  transcription,
                  value,
                );
                const progressLabel = formatDownloadProgress(downloadSnapshot);

                return (
                  <MenuItem key={value} value={value}>
                    <Stack spacing={0.75} sx={{ width: "100%" }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                        sx={{ width: "100%" }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {label}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {helper}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {selectable
                              ? intl.formatMessage({
                                  defaultMessage: "Downloaded",
                                })
                              : status?.validationError ||
                                intl.formatMessage({
                                  defaultMessage: "Not downloaded",
                                })}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          color={selectable ? "error" : "primary"}
                          disabled={downloading || deleting}
                          sx={{
                            minWidth: 0,
                            minHeight: 24,
                            px: 1.25,
                            borderRadius: 999,
                            boxShadow: "none",
                            textTransform: "none",
                            fontSize: 12,
                            lineHeight: 1.2,
                            alignSelf: "center",
                            "&:hover": {
                              boxShadow: "none",
                            },
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (selectable) {
                              handleDeleteModel(value);
                              return;
                            }
                            handleDownloadModel(value);
                          }}
                        >
                          {downloading
                            ? intl.formatMessage({
                                defaultMessage: "Downloading...",
                              })
                            : deleting
                              ? intl.formatMessage({
                                  defaultMessage: "Deleting...",
                                })
                              : selectable
                                ? intl.formatMessage({
                                    defaultMessage: "Delete",
                                  })
                                : intl.formatMessage({
                                    defaultMessage: "Download",
                                  })}
                        </Button>
                      </Stack>

                      {downloading && (
                        <LinearProgress
                          variant={
                            downloadSnapshot?.progress != null
                              ? "determinate"
                              : "indeterminate"
                          }
                          value={
                            downloadSnapshot?.progress != null
                              ? Math.max(
                                  0,
                                  Math.min(1, downloadSnapshot.progress),
                                ) * 100
                              : undefined
                          }
                        />
                      )}

                      {downloading && progressLabel && (
                        <Typography variant="caption" color="text.secondary">
                          {progressLabel}
                        </Typography>
                      )}
                    </Stack>
                  </MenuItem>
                );
              })}
            </Select>
            {showInlineModelDownloadAction && (
              <Box
                sx={{
                  position: "absolute",
                  right: 36,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1,
                }}
              >
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  sx={{
                    minWidth: 0,
                    minHeight: 24,
                    px: 1.25,
                    borderRadius: 999,
                    boxShadow: "none",
                    textTransform: "none",
                    fontSize: 12,
                    lineHeight: 1.2,
                    "&:hover": {
                      boxShadow: "none",
                    },
                  }}
                  disabled={modelDownloading}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDownloadModel(modelValue);
                  }}
                >
                  {modelDownloading
                    ? intl.formatMessage({ defaultMessage: "Downloading..." })
                    : intl.formatMessage({ defaultMessage: "Download" })}
                </Button>
              </Box>
            )}
          </FormControl>

          {localTranscriptionConfig.modelStatusesLoading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage defaultMessage="Refreshing model status..." />
              </Typography>
            </Stack>
          )}
        </Stack>
      )}

      {transcription.mode === "api" && (
        <ApiKeyList
          selectedApiKeyId={transcription.selectedApiKeyId}
          onChange={handleApiKeyChange}
          context="transcription"
        />
      )}

      {transcription.mode === "cloud" && <VoquillCloudSetting />}
    </Stack>
  );
};
