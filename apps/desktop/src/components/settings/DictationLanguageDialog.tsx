import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { produceAppState, useAppStore } from "../../store";

export const DictationLanguageDialog = () => {
  const open = useAppStore(
    (state) => state.settings.dictationLanguageDialogOpen,
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.dictationLanguageDialogOpen = false;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        <FormattedMessage defaultMessage="Dictation language" />
      </DialogTitle>
      <DialogContent dividers sx={{ minWidth: 360 }} />
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
