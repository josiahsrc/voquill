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
import { FormattedMessage } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import { AIPostProcessingConfiguration } from "./AIPostProcessingConfiguration";

export const AIPostProcessingDialog = () => {
  const open = useAppStore(
    (state) => state.settings.aiPostProcessingDialogOpen,
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.aiPostProcessingDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        <FormattedMessage defaultMessage="AI post processing" />
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ ml: "auto" }}
          aria-label="Close"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} alignItems="flex-start">
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Tell Voquill how to enhance your transcripts after they are created." />
          </Typography>

          <AIPostProcessingConfiguration />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Done" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
