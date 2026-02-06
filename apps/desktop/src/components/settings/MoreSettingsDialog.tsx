import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import type { SelectChangeEvent } from "@mui/material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  Switch,
} from "@mui/material";
import type { DictationPillVisibility, StylingMode } from "@repo/types";
import { ChangeEvent, useCallback, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  setDictationPillVisibility,
  setIgnoreUpdateDialog,
  setIncognitoModeEnabled,
  setIncognitoModeIncludeInStats,
  setStylingMode,
} from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import type { LogLevel } from "../../types/log.types";
import { getAllowChangeStylingMode } from "../../utils/enterprise.utils";
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import { getLogLevel, getLogger, setLogLevel } from "../../utils/log.utils";
import {
  getEffectivePillVisibility,
  getMyUserPreferences,
} from "../../utils/user.utils";
import { SettingSection } from "../common/SettingSection";

export const MoreSettingsDialog = () => {
  const intl = useIntl();
  const [
    open,
    ignoreUpdateDialog,
    incognitoModeEnabled,
    incognitoIncludeInStats,
    dictationPillVisibility,
    stylingMode,
    canChangeStylingMode,
  ] = useAppStore((state) => {
    const prefs = getMyUserPreferences(state);
    return [
      state.settings.moreSettingsDialogOpen,
      prefs?.ignoreUpdateDialog ?? false,
      prefs?.incognitoModeEnabled ?? false,
      prefs?.incognitoModeIncludeInStats ?? false,
      getEffectivePillVisibility(prefs?.dictationPillVisibility),
      getEffectiveStylingMode(state),
      getAllowChangeStylingMode(state),
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

  const handleDictationPillVisibilityChange = (
    event: SelectChangeEvent<DictationPillVisibility>,
  ) => {
    const visibility = event.target.value as DictationPillVisibility;
    void setDictationPillVisibility(visibility);
  };

  const handleStylingModeChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void setStylingMode(value === "" ? null : (value as StylingMode));
  };

  const [logLevel, setLogLevelState] = useState<LogLevel>(getLogLevel);

  const handleLogLevelChange = (event: SelectChangeEvent<LogLevel>) => {
    const level = event.target.value as LogLevel;
    setLogLevel(level);
    setLogLevelState(level);
  };

  const handleDownloadLogs = useCallback(() => {
    const logger = getLogger();
    const logs = logger.getLogs();
    const blob = new Blob([logs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voquill-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        <FormattedMessage defaultMessage="More settings" />
      </DialogTitle>
      <DialogContent dividers sx={{ minWidth: 360 }}>
        <Stack spacing={3}>
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
            title={
              <FormattedMessage defaultMessage="Automatically show updates" />
            }
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

          <SettingSection
            title={
              <FormattedMessage defaultMessage="Dictation pill visibility" />
            }
            description={
              <FormattedMessage defaultMessage="Control when the dictation pill is shown on screen." />
            }
            action={
              <Select<DictationPillVisibility>
                size="small"
                value={dictationPillVisibility}
                onChange={handleDictationPillVisibilityChange}
                sx={{ minWidth: 152 }}
              >
                <MenuItem value="persistent">
                  {intl.formatMessage({ defaultMessage: "Persistent" })}
                </MenuItem>
                <MenuItem value="while_active">
                  {intl.formatMessage({ defaultMessage: "While active" })}
                </MenuItem>
                <MenuItem value="hidden">
                  {intl.formatMessage({ defaultMessage: "Hidden" })}
                </MenuItem>
              </Select>
            }
          />

          {canChangeStylingMode && (
            <SettingSection
              title={<FormattedMessage defaultMessage="Styling mode" />}
              description={
                <FormattedMessage defaultMessage="Choose how to switch between writing styles." />
              }
              action={
                <Select<string>
                  size="small"
                  value={stylingMode}
                  onChange={handleStylingModeChange}
                  sx={{ minWidth: 152 }}
                >
                  <MenuItem value="app">
                    {intl.formatMessage({ defaultMessage: "Based on app" })}
                  </MenuItem>
                  <MenuItem value="manual">
                    {intl.formatMessage({ defaultMessage: "Manual" })}
                  </MenuItem>
                </Select>
              }
            />
          )}

          <SettingSection
            title={<FormattedMessage defaultMessage="Log level" />}
            description={
              <FormattedMessage defaultMessage="Controls how much detail is captured in diagnostic logs." />
            }
            action={
              <Select<LogLevel>
                size="small"
                value={logLevel}
                onChange={handleLogLevelChange}
                sx={{ minWidth: 152 }}
              >
                <MenuItem value="info">
                  {intl.formatMessage({ defaultMessage: "Info" })}
                </MenuItem>
                <MenuItem value="verbose">
                  {intl.formatMessage({ defaultMessage: "Verbose" })}
                </MenuItem>
              </Select>
            }
          />

          <SettingSection
            title={<FormattedMessage defaultMessage="Download logs" />}
            description={
              <FormattedMessage defaultMessage="Export diagnostic logs as a text file for troubleshooting." />
            }
            action={
              <Button
                size="small"
                startIcon={<DownloadRoundedIcon />}
                onClick={handleDownloadLogs}
              >
                <FormattedMessage defaultMessage="Download" />
              </Button>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
