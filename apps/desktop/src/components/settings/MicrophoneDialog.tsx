import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { produceAppState, useAppStore } from "../../store";

export const MicrophoneDialog = () => {
  const open = useAppStore((state) => state.settings.microphoneDialogOpen);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.microphoneDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Microphone</DialogTitle>
      <DialogContent>
        <DialogContentText>
          TODO: Implement microphone dialog.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
