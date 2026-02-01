import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import type { UserWithAuth } from "@repo/types";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { deleteUser } from "../../actions/users.actions";

export const DeleteUserDialog = ({
  user,
  open,
  onClose,
}: {
  user: UserWithAuth;
  open: boolean;
  onClose: () => void;
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteUser(user.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>
        <FormattedMessage defaultMessage="Delete user" />
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          <FormattedMessage
            defaultMessage="Permanently delete {name} and all associated data (account, profile, terms, membership)? This cannot be undone."
            values={{ name: <strong>{user.name || user.email}</strong> }}
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          <FormattedMessage defaultMessage="Delete" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
