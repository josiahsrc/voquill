import { ArrowUpwardOutlined } from "@mui/icons-material";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useMemo } from "react";
import Markdown from "react-markdown";
import {
  dismissUpdateDialog,
  installAvailableUpdate,
} from "../../actions/updater.actions";
import { useAppStore } from "../../store";
import { formatSize } from "../../utils/format.utils";
import { FormattedMessage, useIntl } from "react-intl";

const formatReleaseDate = (isoDate: string | null) => {
  if (!isoDate) {
    return null;
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

export const UpdateDialog = () => {
  const updater = useAppStore((state) => state.updater);
  const intl = useIntl();
  const {
    dialogOpen,
    status,
    availableVersion,
    currentVersion,
    releaseDate,
    releaseNotes,
    downloadProgress,
    downloadedBytes,
    totalBytes,
    errorMessage,
  } = updater;

  const isUpdating = status === "downloading" || status === "installing";
  const showProgress = status === "downloading" || status === "installing";

  const versionLabel = availableVersion
    ? intl.formatMessage(
        {
          defaultMessage: "Voquill {version}",
        },
        { version: availableVersion }
      )
    : intl.formatMessage({
        defaultMessage: "A Voquill update",
      });

  const formattedDate = useMemo(
    () => formatReleaseDate(releaseDate),
    [releaseDate]
  );

  const percent = useMemo(() => {
    if (downloadProgress == null) {
      return null;
    }
    const clamped = Math.max(0, Math.min(1, downloadProgress));
    return Math.round(clamped * 100);
  }, [downloadProgress]);

  const progressLabel = useMemo(() => {
    if (downloadedBytes == null || totalBytes == null || totalBytes <= 0) {
      return null;
    }
    return `${formatSize(downloadedBytes)} of ${formatSize(totalBytes)}`;
  }, [downloadedBytes, totalBytes]);

  const currentVersionLabel =
    currentVersion ??
    intl.formatMessage({
      defaultMessage: "unknown",
    });

  const readyToInstallLabel = intl.formatMessage(
    {
      defaultMessage: "{label} is ready to install.",
    },
    { label: versionLabel }
  );

  const currentVersionDescription = intl.formatMessage(
    {
      defaultMessage:
        "You're currently on version {version}. The app will restart after the update finishes.",
    },
    { version: currentVersionLabel }
  );

  const handleClose = useCallback(() => {
    if (isUpdating) {
      return;
    }
    dismissUpdateDialog();
  }, [isUpdating]);

  const handleInstall = useCallback(async () => {
    if (isUpdating) {
      return;
    }
    await installAvailableUpdate();
  }, [isUpdating]);

  return (
    <Dialog
      open={dialogOpen}
      onClose={(_, __) => {
        if (!isUpdating) {
          handleClose();
        }
      }}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown={isUpdating}
    >
      <DialogTitle>
        <FormattedMessage defaultMessage="Update available" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="body1" fontWeight={600}>
              {readyToInstallLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentVersionDescription}
            </Typography>
            {formattedDate && (
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage
                  defaultMessage="Released on {date}"
                  values={{ date: formattedDate }}
                />
              </Typography>
            )}
          </Stack>

          {releaseNotes && (
            <Stack spacing={1}>
              <Typography variant="body1">
                <FormattedMessage defaultMessage="What's new" />
              </Typography>
              <Markdown>{releaseNotes}</Markdown>
            </Stack>
          )}

          {showProgress && (
            <Stack spacing={1}>
              <LinearProgress
                variant={percent != null ? "determinate" : "indeterminate"}
                value={percent ?? undefined}
              />
              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {status === "installing" ? (
                    <FormattedMessage defaultMessage="Installing update..." />
                  ) : (
                    <FormattedMessage defaultMessage="Downloading update..." />
                  )}
                </Typography>
                {progressLabel && (
                  <Typography variant="caption" color="text.secondary">
                    {progressLabel}
                    {percent != null ? ` (${percent}%)` : ""}
                  </Typography>
                )}
              </Stack>
            </Stack>
          )}

          {status === "installing" && (
            <Alert severity="info" variant="outlined">
              <FormattedMessage defaultMessage="Installation in progress. Voquill may restart automatically when finished." />
            </Alert>
          )}

          {status === "error" && errorMessage && (
            <Alert severity="error" variant="outlined">
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isUpdating}>
          <FormattedMessage defaultMessage="Later" />
        </Button>
        <Button
          variant="contained"
          onClick={handleInstall}
          disabled={isUpdating}
          endIcon={
            isUpdating ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <ArrowUpwardOutlined />
            )
          }
        >
          <FormattedMessage defaultMessage="Update" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
