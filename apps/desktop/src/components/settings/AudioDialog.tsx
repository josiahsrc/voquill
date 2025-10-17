import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { produceAppState, useAppStore } from "../../store";

export const AudioDialog = () => {
  const open = useAppStore((state) => state.settings.audioDialogOpen);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.audioDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Audio</DialogTitle>
      <DialogContent>
        <DialogContentText>TODO: Implement audio dialog.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
