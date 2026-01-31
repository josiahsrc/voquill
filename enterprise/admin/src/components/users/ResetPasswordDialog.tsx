import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import type { UserWithAuth } from "@repo/types";
import { useState } from "react";
import { resetPassword } from "../../actions/users.actions";

export const ResetPasswordDialog = ({
  user,
  open,
  onClose,
}: {
  user: UserWithAuth;
  open: boolean;
  onClose: () => void;
}) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await resetPassword(user.id, password);
      setPassword("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setPassword("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Reset password</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Set a new password for <strong>{user.name || user.email}</strong>.
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          type="text"
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || password.length < 8}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
};
