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
import {
  setIgnoreUpdateDialog,
  setIncognitoModeEnabled,
  setIncognitoModeIncludeInStats,
} from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyUserPreferences } from "../../utils/user.utils";
import { SettingSection } from "../common/SettingSection";

export const MoreSettingsDialog = () => {
  const [open, ignoreUpdateDialog, incognitoModeEnabled, incognitoIncludeInStats] =
    useAppStore((state) => {
    const prefs = getMyUserPreferences(state);
    return [
      state.settings.moreSettingsDialogOpen,
      prefs?.ignoreUpdateDialog ?? false,
      prefs?.incognitoModeEnabled ?? false,
      prefs?.incognitoModeIncludeInStats ?? false,
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

  const handleToggleIncognitoMode = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    void setIncognitoModeEnabled(enabled);
  };

  const handleToggleIncognitoIncludeInStats = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const enabled = event.target.checked;
    void setIncognitoModeIncludeInStats(enabled);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        <FormattedMessage defaultMessage="More settings" />
      </DialogTitle>
      <DialogContent sx={{ minWidth: 360 }}>
        <SettingSection
          title={<FormattedMessage defaultMessage="Incognito mode" />}
          description={
            <FormattedMessage defaultMessage="When enabled, Voquill will not save transcription history or audio snapshots." />
          }
          action={
            <Switch
              edge="end"
              checked={incognitoModeEnabled}
              onChange={handleToggleIncognitoMode}
            />
          }
        />

        {incognitoModeEnabled && (
          <SettingSection
            title={
              <FormattedMessage defaultMessage="Include incognito in stats" />
            }
            description={
              <FormattedMessage defaultMessage="If enabled, words dictated in incognito mode will still count toward your usage statistics." />
            }
            action={
              <Switch
                edge="end"
                checked={incognitoIncludeInStats}
                onChange={handleToggleIncognitoIncludeInStats}
              />
            }
          />
        )}

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
