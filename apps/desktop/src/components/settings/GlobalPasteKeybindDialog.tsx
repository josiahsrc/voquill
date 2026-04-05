import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { updateUserPreferences } from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyUserPreferences } from "../../utils/user.utils";

export const GlobalPasteKeybindDialog = () => {
  const open = useAppStore(
    (state) => state.settings.globalPasteKeybindDialogOpen,
  );
  const pasteKeybind = useAppStore(
    (state) => getMyUserPreferences(state)?.pasteKeybind ?? "ctrl+v",
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.globalPasteKeybindDialogOpen = false;
    });
  };

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void updateUserPreferences((prefs) => {
      prefs.pasteKeybind = value === "ctrl+v" ? null : value;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage defaultMessage="Paste Binding" />
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage defaultMessage="Wayland does not allow apps to detect which application is focused, so Voquill uses a single paste binding for all apps. Some apps like terminals use Ctrl+Shift+V or Shift+Insert instead of Ctrl+V." />
        </Typography>
        <Select
          value={pasteKeybind}
          onChange={handleChange}
          size="small"
          variant="outlined"
          fullWidth
        >
          <MenuItem value="ctrl+v">
            <FormattedMessage defaultMessage="Default (Ctrl+V)" />
          </MenuItem>
          <MenuItem value="ctrl+shift+v">
            <FormattedMessage defaultMessage="Terminal (Ctrl+Shift+V)" />
          </MenuItem>
          <MenuItem value="shift+insert">
            <FormattedMessage defaultMessage="Shift+Insert" />
          </MenuItem>
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
