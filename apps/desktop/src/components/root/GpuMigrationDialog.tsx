import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FormattedMessage } from "react-intl";

type GpuMigrationDialogProps = {
  open: boolean;
  onClose: () => void;
};

export const GpuMigrationDialog = ({
  open,
  onClose,
}: GpuMigrationDialogProps) => {
  const handleOpenDownloadPage = () => {
    openUrl("https://voquill.com");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <FormattedMessage defaultMessage="Move to the new Voquill app" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Alert severity="warning" variant="outlined">
            <FormattedMessage defaultMessage="You're using an older Voquill app that will no longer receive updates." />
          </Alert>

          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="We've moved everything into one new Voquill app. Follow these steps to keep getting updates." />
          </Typography>

          <Stack component="ol" spacing={1} sx={{ pl: 2, mb: 0 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Uninstall this app first." />
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Open the download page." />
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Install the latest Voquill app." />
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Sign in with the same account to continue." />
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage defaultMessage="Later" />
        </Button>
        <Button onClick={handleOpenDownloadPage} variant="contained">
          <FormattedMessage defaultMessage="Open download page" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
