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
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { updateMyUserName } from "../../actions/users.actions";
import { useAppStore } from "../../store";

export default function UserInfoDialog() {
  const intl = useIntl();
  const myUser = useAppStore((state) => state.myUser);
  const myUserLoaded = useAppStore((state) => state.myUserLoaded);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const open = myUserLoaded && !myUser?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateMyUserName(name.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <FormattedMessage defaultMessage="Complete your profile" />
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            <FormattedMessage defaultMessage="Please enter your name to continue." />
          </DialogContentText>
          <TextField
            autoFocus
            label={intl.formatMessage({ defaultMessage: "Full Name" })}
            fullWidth
            size="small"
            value={name}
            disabled={loading}
            onChange={(e) => setName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !name.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            <FormattedMessage defaultMessage="Save" />
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
