import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import type { SelectChangeEvent } from "@mui/material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
} from "@mui/material";
import type { DictationPillVisibility, StylingMode } from "@repo/types";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  setDictationPillVisibility,
  setIgnoreUpdateDialog,
  setIncognitoModeEnabled,
  setIncognitoModeIncludeInStats,
  setStylingMode,
  setUseNewBackend,
} from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import type { LogLevel } from "../../types/log.types";
import { getAllowChangeStylingMode } from "../../utils/enterprise.utils";
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import {
  downloadLogs,
  getLogLevel,
  setLogLevel,
  setOnBufferWrap,
} from "../../utils/log.utils";
import {
  getEffectivePillVisibility,
  getMyUserPreferences,
} from "../../utils/user.utils";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
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
    useNewBackend,
    autoDownloadLogs,
    isEnterprise,
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
      prefs?.useNewBackend ?? false,
      state.settings.autoDownloadLogs,
      state.isEnterprise,
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

  const handleToggleUseNewBackend = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    void setUseNewBackend(enabled);
  };

  const [logLevel, setLogLevelState] = useState<LogLevel>(getLogLevel);

  const handleLogLevelChange = (event: SelectChangeEvent<LogLevel>) => {
    const level = event.target.value as LogLevel;
    setLogLevel(level);
    setLogLevelState(level);
  };

  const handleDownloadLogs = useCallback(() => {
    downloadLogs();
  }, []);

  const handleStartAutoDownload = useCallback(() => {
    setOnBufferWrap(downloadLogs);
    produceAppState((draft) => {
      draft.settings.autoDownloadLogs = true;
    });
  }, []);

  const handleStopAutoDownload = useCallback(() => {
    setOnBufferWrap(null);
    produceAppState((draft) => {
      draft.settings.autoDownloadLogs = false;
    });
  }, []);

  const autoDownloadMenuItems: MenuPopoverItem[] = useMemo(
    () => [
      {
        kind: "genericItem" as const,
        builder: ({ close }: { close: () => void }) => (
          <ListItemButton
            onClick={() => {
              close();
              handleStartAutoDownload();
            }}
          >
            <ListItemText
              primary={intl.formatMessage({
                defaultMessage: "Auto download",
              })}
              secondary={intl.formatMessage({
                defaultMessage: "Only active for the duration of this session.",
              })}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItemButton>
        ),
      },
    ],
    [intl, handleStartAutoDownload],
  );

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

          {!isEnterprise && (
            <SettingSection
              title={<FormattedMessage defaultMessage="Use new backend" />}
              description={
                <FormattedMessage defaultMessage="Use the new cloud backend for transcription and text generation. Requires cloud mode to be enabled." />
              }
              action={
                <Switch
                  edge="end"
                  checked={useNewBackend}
                  onChange={handleToggleUseNewBackend}
                />
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
              autoDownloadLogs ? (
                <Button
                  size="small"
                  color="error"
                  startIcon={
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 10,
                        height: 10,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "error.main",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "error.main",
                          animation:
                            "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                          "@keyframes ping": {
                            "0%": {
                              transform: "scale(1)",
                              opacity: 0.75,
                            },
                            "75%, 100%": {
                              transform: "scale(2.5)",
                              opacity: 0,
                            },
                          },
                        }}
                      />
                    </Box>
                  }
                  onClick={handleStopAutoDownload}
                >
                  <FormattedMessage defaultMessage="Stop" />
                </Button>
              ) : (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <MenuPopoverBuilder items={autoDownloadMenuItems}>
                    {({ ref, open }) => (
                      <IconButton ref={ref} onClick={open} size="small">
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </MenuPopoverBuilder>
                  <Button
                    size="small"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={handleDownloadLogs}
                  >
                    <FormattedMessage defaultMessage="Download" />
                  </Button>
                </Stack>
              )
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
