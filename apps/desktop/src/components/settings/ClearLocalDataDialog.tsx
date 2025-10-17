import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { produceAppState, useAppStore } from "../../store";

export const ClearLocalDataDialog = () => {
  const open = useAppStore((state) => state.settings.clearLocalDataDialogOpen);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.clearLocalDataDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Clear local data</DialogTitle>
      <DialogContent>
        <DialogContentText>
          TODO: Implement clear local data dialog.
        </DialogContentText>
        <DialogContentText>TODO: Confirm data removal flow.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={handleClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
