import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { showSnackbar } from "../../actions/app.actions";
import { getAuthRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";

export const DeleteAccountDialog = () => {
  const open = useAppStore((state) => state.settings.deleteAccountDialog);
  const userEmail = useAppStore((state) => state.auth?.email);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  const isDeleteEnabled = confirmationEmail === userEmail && userEmail;

  const handleClose = () => {
    produceAppState((state) => {
      state.settings.deleteAccountDialog = false;
    });
    setConfirmationEmail("");
  };

  const handleSubmit = async () => {
    if (!isDeleteEnabled) {
      return;
    }

    try {
      await getAuthRepo().deleteMyAccount();
      setConfirmationEmail("");
      showSnackbar("You account has been deleted", { duration: 15000 });
      produceAppState((state) => {
        state.settings.deleteAccountDialog = false;
      });
    } catch (error) {
      showSnackbar(
        "An error occurred while attempting to delete your account. Please try again later."
      );
    }
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationEmail(event.target.value);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="h6" component="div" fontWeight={600} color="error">
          Delete account
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action cannot be undone. All your data will be permanently
          deleted.
        </Alert>
        <Typography variant="body1" component="div" sx={{ mb: 2 }}>
          Are you sure you want to delete your account? This will:
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <Typography component="li" variant="body2">
            Permanently delete all your data
          </Typography>
          <Typography component="li" variant="body2">
            Cancel any active subscriptions
          </Typography>
          <Typography component="li" variant="body2">
            Remove access to all premium features
          </Typography>
          <Typography component="li" variant="body2">
            Sign you out immediately
          </Typography>
        </Box>
        {userEmail && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Account to be deleted: <strong>{userEmail}</strong>
          </Typography>
        )}

        <Typography variant="body2" sx={{ mb: 1 }}>
          To confirm, type your email address below:
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={userEmail || "Enter your email"}
          value={confirmationEmail}
          onChange={handleEmailChange}
          size="small"
          sx={{ mb: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="text">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={!isDeleteEnabled}
        >
          Delete account
        </Button>
      </DialogActions>
    </Dialog>
  );
};
