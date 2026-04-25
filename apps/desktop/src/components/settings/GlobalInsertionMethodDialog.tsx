import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { updateUserPreferences } from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyUserPreferences } from "../../utils/user.utils";

export const GlobalInsertionMethodDialog = () => {
  const open = useAppStore(
    (state) => state.settings.globalInsertionMethodDialogOpen,
  );
  const insertionMethod = useAppStore(
    (state) => getMyUserPreferences(state)?.insertionMethod ?? "paste",
  );
  const typingSpeedMs = useAppStore(
    (state) => getMyUserPreferences(state)?.typingSpeedMs ?? 40,
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.globalInsertionMethodDialogOpen = false;
    });
  };

  const handleMethodChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void updateUserPreferences((prefs) => {
      prefs.insertionMethod = value === "paste" ? null : value;
    });
  };

  const handleSpeedChange = (_: Event, value: number | number[]) => {
    const num = Array.isArray(value) ? value[0] : value;
    void updateUserPreferences((prefs) => {
      prefs.typingSpeedMs = num;
    });
  };

  const showSpeedSlider = insertionMethod === "type";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage defaultMessage="Text Insertion" />
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage defaultMessage="Choose how Voquill inserts text into the focused application. Paste uses the clipboard and is faster. Simulated typing sends keystrokes one at a time and works with remote desktop apps where paste may fail." />
        </Typography>
        <Select
          value={insertionMethod}
          onChange={handleMethodChange}
          size="small"
          variant="outlined"
          fullWidth
          sx={{ mb: showSpeedSlider ? 3 : 0 }}
        >
          <MenuItem value="paste">
            <FormattedMessage defaultMessage="Paste (clipboard)" />
          </MenuItem>
          <MenuItem value="type">
            <FormattedMessage defaultMessage="Simulated typing" />
          </MenuItem>
        </Select>
        {showSpeedSlider && (
          <Stack spacing={1}>
            <Typography variant="body2">
              <FormattedMessage defaultMessage="Typing speed" />
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Slider
                value={typingSpeedMs}
                onChange={handleSpeedChange}
                min={10}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}ms`}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              <FormattedMessage defaultMessage="Delay between each keystroke. Increase this if characters are being dropped in remote desktop sessions." />
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
