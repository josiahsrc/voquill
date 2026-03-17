import CloseIcon from "@mui/icons-material/Close";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { ChangeEvent, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useLocalStorage } from "../../hooks/local-storage.hooks";
import { produceAppState, useAppStore } from "../../store";
import {
  ASSISTANT_MODE_ENABLED_KEY,
  POWER_MODE_ENABLED_KEY,
} from "../../utils/assistant-mode.utils";
import { AGENT_DICTATE_HOTKEY } from "../../utils/keyboard.utils";
import { AIAgentModeConfiguration } from "./AIAgentModeConfiguration";
import { HotkeySetting } from "./HotkeySetting";

export const AIAgentModeDialog = () => {
  const open = useAppStore((state) => state.settings.agentModeDialogOpen);
  const [assistantModeEnabled, setAssistantModeEnabled] =
    useLocalStorage<boolean>(ASSISTANT_MODE_ENABLED_KEY, false);
  const [powerModeEnabled, setPowerModeEnabled] = useLocalStorage<boolean>(
    POWER_MODE_ENABLED_KEY,
    false,
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.agentModeDialogOpen = false;
    });
  };

  const handleAssistantModeToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setAssistantModeEnabled(event.target.checked);
  };

  const [powerModeWarningOpen, setPowerModeWarningOpen] = useState(false);

  const handlePowerModeToggle = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setPowerModeWarningOpen(true);
    } else {
      setPowerModeEnabled(false);
    }
  };

  const handleConfirmPowerMode = () => {
    setPowerModeEnabled(true);
    setPowerModeWarningOpen(false);
  };

  return (
    <>
      <Dialog
        open={powerModeWarningOpen}
        onClose={() => setPowerModeWarningOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberRoundedIcon color="warning" />
          <FormattedMessage defaultMessage="Enable power mode?" />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Power mode allows the assistant to run terminal commands on your computer. This is powerful but inherently dangerous — commands run with your full user permissions and can modify files, install software, or access sensitive data." />
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            <FormattedMessage defaultMessage="This feature is very experimental. Only enable this if you know what you're doing. You will still be asked to approve each command before it runs." />
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.5, fontWeight: 600 }}
          >
            <FormattedMessage defaultMessage="By enabling power mode, you accept full responsibility for any actions taken by the assistant. Voquill is not liable for any consequences resulting from commands executed on your system." />
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPowerModeWarningOpen(false)}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button
            onClick={handleConfirmPowerMode}
            color="warning"
            variant="contained"
          >
            <FormattedMessage defaultMessage="I understand, enable power mode" />
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FormattedMessage defaultMessage="Assistant mode" />
          <Chip label="Beta" size="small" color="primary" />
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
              <FormattedMessage defaultMessage="Assistant mode follows commands you dictate instead of just cleaning up text." />
            </Typography>

            <AIAgentModeConfiguration />

            <Divider flexItem />

            <HotkeySetting
              title={<FormattedMessage defaultMessage="Assistant hotkey" />}
              description={
                <FormattedMessage defaultMessage="Press this key combination to start assistant mode." />
              }
              actionName={AGENT_DICTATE_HOTKEY}
            />

            <Divider flexItem />

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              sx={{ width: "100%" }}
            >
              <Stack spacing={0.5} flex={1}>
                <Typography variant="body1" fontWeight="bold">
                  <FormattedMessage defaultMessage="Assistant mode" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage defaultMessage="Assistant mode is disabled by default. This is a new feature — if you have any feedback, please stop by our Discord channel" />
                </Typography>
              </Stack>
              <Switch
                checked={assistantModeEnabled}
                onChange={handleAssistantModeToggle}
              />
            </Stack>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              sx={{ width: "100%" }}
            >
              <Stack spacing={0.5} flex={1}>
                <Typography variant="body1" fontWeight="bold">
                  <FormattedMessage defaultMessage="Power mode" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage defaultMessage="Allow the assistant to run terminal commands on your behalf. This is a temporary guardrail that will be removed in a future update. Restart Voquill to apply changes." />
                </Typography>
              </Stack>
              <Switch
                checked={powerModeEnabled}
                onChange={handlePowerModeToggle}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            <FormattedMessage defaultMessage="Done" />
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
