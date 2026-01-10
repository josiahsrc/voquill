import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import {
  AGENT_DICTATE_HOTKEY,
  DICTATE_HOTKEY,
} from "../../utils/keyboard.utils";
import { HotkeySetting } from "./HotkeySetting";
import { LanguageSwitchHotkeySetting } from "./LanguageSwitchHotkeySetting";

export const ShortcutsDialog = () => {
  const { open, hotkeysStatus } = useAppStore(
    (state) => ({
      open: state.settings.shortcutsDialogOpen,
      hotkeysStatus: state.settings.hotkeysStatus,
    }),
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.shortcutsDialogOpen = false;
    });
  };

  const renderContent = () => {
    if (hotkeysStatus === "loading") {
      return (
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          sx={{ py: 4 }}
        >
          <CircularProgress size={24} />
        </Stack>
      );
    }

    return (
      <Stack spacing={3}>
        <HotkeySetting
          title={<FormattedMessage defaultMessage="Start/stop dictating" />}
          description={
            <FormattedMessage defaultMessage="Start recording audio and transcribe your speech into text with AI." />
          }
          actionName={DICTATE_HOTKEY}
        />
        <HotkeySetting
          title={<FormattedMessage defaultMessage="Agent mode" />}
          description={
            <FormattedMessage defaultMessage="Dictate commands for the AI to follow instead of just cleaning up text." />
          }
          actionName={AGENT_DICTATE_HOTKEY}
        />
        <LanguageSwitchHotkeySetting />
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack spacing={1}>
          <Typography variant="h6">
            <FormattedMessage defaultMessage="Keyboard shortcuts" />
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <FormattedMessage defaultMessage="Customize your keyboard shortcuts. Keyboard shortcuts can be triggered from within any app." />
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>{renderContent()}</DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
