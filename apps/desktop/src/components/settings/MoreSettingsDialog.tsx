import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Switch,
} from "@mui/material";
import { ChangeEvent } from "react";
import { FormattedMessage } from "react-intl";
import { setIgnoreUpdateDialog } from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyUserPreferences } from "../../utils/user.utils";
import { SettingSection } from "../common/SettingSection";

export const MoreSettingsDialog = () => {
  const [open, ignoreUpdateDialog] = useAppStore((state) => {
    const prefs = getMyUserPreferences(state);
    return [
      state.settings.moreSettingsDialogOpen,
      prefs?.ignoreUpdateDialog ?? false,
    ] as const;
  });

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.moreSettingsDialogOpen = false;
    });
  };

  const handleToggleShowUpdates = (event: ChangeEvent<HTMLInputElement>) => {
    const showUpdates = event.target.checked;
    void setIgnoreUpdateDialog(!showUpdates);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        <FormattedMessage defaultMessage="More settings" />
      </DialogTitle>
      <DialogContent sx={{ minWidth: 360 }}>
        <SettingSection
          title={<FormattedMessage defaultMessage="Automatically show updates" />}
          description={
            <FormattedMessage defaultMessage="Automatically open the update window when a new version is available." />
          }
          action={
            <Switch
              edge="end"
              checked={!ignoreUpdateDialog}
              onChange={handleToggleShowUpdates}
            />
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
