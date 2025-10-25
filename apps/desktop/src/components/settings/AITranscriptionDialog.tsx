import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { produceAppState, useAppStore } from "../../store";
import { AITranscriptionConfiguration } from "./AITranscriptionConfiguration";

export const AITranscriptionDialog = () => {
  const open = useAppStore((state) => state.settings.aiTranscriptionDialogOpen);

  const closeDialog = () => {
    produceAppState((draft) => {
      draft.settings.aiTranscriptionDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        AI transcription
        <IconButton
          aria-label="Close"
          onClick={closeDialog}
          size="small"
          sx={{ ml: "auto" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} alignItems="flex-start">
          <Typography variant="body1" color="text.secondary">
            Decide how Voquill should transcribe your recordings—locally on your
            machine or through a connected provider.
          </Typography>
          <AITranscriptionConfiguration />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};
