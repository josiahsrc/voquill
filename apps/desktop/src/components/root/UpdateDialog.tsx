import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useCallback, useMemo } from "react";
import {
  dismissUpdateDialog,
  installAvailableUpdate,
} from "../../actions/updater.actions";
import { useAppStore } from "../../store";
import { formatSize } from "../../utils/format.utils";

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
    ? `Voquill ${availableVersion}`
    : "A Voquill update";

  const formattedDate = useMemo(
    () => formatReleaseDate(releaseDate),
    [releaseDate],
  );

  const percent = useMemo(() => {
    if (downloadProgress == null) {
      return null;
    }
    const clamped = Math.max(0, Math.min(1, downloadProgress));
    return Math.round(clamped * 100);
  }, [downloadProgress]);

  const progressLabel = useMemo(() => {
    if (
      downloadedBytes == null ||
      totalBytes == null ||
      totalBytes <= 0
    ) {
      return null;
    }
    return `${formatSize(downloadedBytes)} of ${formatSize(totalBytes)}`;
  }, [downloadedBytes, totalBytes]);

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
      <DialogTitle>Update available</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="body1" fontWeight={600}>
              {versionLabel} is ready to install.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You&apos;re currently on version {currentVersion ?? "unknown"}.
              The app will restart after the update finishes.
            </Typography>
            {formattedDate && (
              <Typography variant="caption" color="text.secondary">
                Released on {formattedDate}
              </Typography>
            )}
          </Stack>

          {releaseNotes && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">What&apos;s new</Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap" }}
                color="text.secondary"
              >
                {releaseNotes}
              </Typography>
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
                  {status === "installing"
                    ? "Installing update..."
                    : "Downloading update..."}
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
              Installation in progress. Voquill may restart automatically
              when finished.
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
          Update later
        </Button>
        <Button
          variant="contained"
          onClick={handleInstall}
          disabled={isUpdating}
          startIcon={
            isUpdating ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Update now
        </Button>
      </DialogActions>
    </Dialog>
  );
};
