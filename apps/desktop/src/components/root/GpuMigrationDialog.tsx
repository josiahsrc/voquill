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
        <FormattedMessage defaultMessage="The GPU app is being deprecated" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Alert severity="warning" variant="outlined">
            <FormattedMessage defaultMessage="The GPU version of Voquill will no longer receive updates." />
          </Alert>

          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Maintaining two separate apps made it harder to ship updates and created confusion about which version to use. To simplify things, we've combined them into a single Universal app that supports both CPU and GPU devices. Please switch to the Universal app to continue receiving updates." />
          </Typography>

          <Stack component="ol" spacing={1} sx={{ pl: 2, mb: 0 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Uninstall the Voquill GPU app." />
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Download the new Universal app from the link below." />
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Install and sign in with the same account" />
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
