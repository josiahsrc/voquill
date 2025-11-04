import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getAuthRepo } from "../../repos";
import { getAppState, produceAppState, useAppStore } from "../../store";

export const ChangePasswordDialog = () => {
  const open = useAppStore((state) => state.settings.changePasswordDialogOpen);
  const userEmail = useAppStore((state) => state.auth?.email);

  const handleClose = () => {
    produceAppState((state) => {
      state.settings.changePasswordDialogOpen = false;
    });
  };

  const handleSubmit = async () => {
    const state = getAppState();
    const userEmail = state.auth?.email;
    if (!userEmail) {
      showErrorSnackbar("No user email found");
      return;
    }

    try {
      await getAuthRepo().sendPasswordResetRequest(userEmail);
      produceAppState((draft) => {
        draft.settings.changePasswordDialogOpen = false;
      });
    } catch (error) {
      showErrorSnackbar(`Error sending password reset email: ${error}`);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="h6" component="div" fontWeight={600}>
          Change password
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" component="div" sx={{ mb: 2 }}>
          We'll send a password reset link to your email address. Click the link
          in the email to create a new password.
        </Typography>
        {userEmail && (
          <Typography variant="body2" component="div" color="textSecondary">
            Reset link will be sent to: <strong>{userEmail}</strong>
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="text">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          Send reset link
        </Button>
      </DialogActions>
    </Dialog>
  );
};
