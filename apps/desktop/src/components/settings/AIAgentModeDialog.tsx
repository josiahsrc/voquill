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
import { AIAgentModeConfiguration } from "./AIAgentModeConfiguration";

export const AIAgentModeDialog = () => {
  const open = useAppStore((state) => state.settings.agentModeDialogOpen);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.agentModeDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        <FormattedMessage defaultMessage="Agent mode" />
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
            <FormattedMessage defaultMessage="Agent mode follows commands you dictate instead of just cleaning up text. Use Shift+F8 to activate." />
          </Typography>

          <AIAgentModeConfiguration />
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
