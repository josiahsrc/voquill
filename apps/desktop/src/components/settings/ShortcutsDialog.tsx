import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { produceAppState, useAppStore } from "../../store";

export const ShortcutsDialog = () => {
  const open = useAppStore((state) => state.settings.shortcutsDialogOpen);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.shortcutsDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Hotkey shortcuts</DialogTitle>
      <DialogContent>
        <DialogContentText>TODO: Implement shortcuts dialog.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
