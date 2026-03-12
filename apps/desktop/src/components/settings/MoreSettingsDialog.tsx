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
  Typography,
} from "@mui/material";
import type { DictationPillVisibility, StylingMode } from "@repo/types";
import { ChangeEvent, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import {
  startRemoteReceiver,
  stopRemoteReceiver,
} from "../../actions/remote-receiver.actions";
import {
  setDictationPillVisibility,
  setIgnoreUpdateDialog,
  setIncognitoModeEnabled,
  setIncognitoModeIncludeInStats,
  setRealtimeOutputEnabled,
  setRemoteOutputEnabled,
  setRemoteTargetDeviceId,
  setStylingMode,
} from "../../actions/user.actions";
import {
  getRemoteReceiverStatus,
  listPairedRemoteDevices,
} from "../../remote/device.store";
import { produceAppState, useAppStore } from "../../store";
import { getAllowChangeStylingMode } from "../../utils/enterprise.utils";
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import {
  getEffectivePillVisibility,
  getMyUserPreferences,
} from "../../utils/user.utils";
import { SettingSection } from "../common/SettingSection";

export const MoreSettingsDialog = () => {
  const intl = useIntl();
  const [receiverBusy, setReceiverBusy] = useState(false);
  const [
    open,
    ignoreUpdateDialog,
    incognitoModeEnabled,
    incognitoIncludeInStats,
    dictationPillVisibility,
    realtimeOutputEnabled,
    remoteOutputEnabled,
    remoteTargetDeviceId,
    pairedDevices,
    receiverStatus,
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
      prefs?.realtimeOutputEnabled ?? false,
      prefs?.remoteOutputEnabled ?? false,
      prefs?.remoteTargetDeviceId ?? null,
      listPairedRemoteDevices(state),
      getRemoteReceiverStatus(state),
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

  const handleToggleRealtimeOutput = (event: ChangeEvent<HTMLInputElement>) => {
    void setRealtimeOutputEnabled(event.target.checked);
  };

  const handleToggleRemoteOutput = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    if (enabled && !remoteTargetDeviceId) {
      showErrorSnackbar("Select a remote target device first.");
      return;
    }
    void setRemoteOutputEnabled(enabled);
  };

  const handleRemoteTargetDeviceChange = (
    event: SelectChangeEvent<string>,
  ) => {
    const deviceId = event.target.value || null;
    void setRemoteTargetDeviceId(deviceId);
  };

  const handleToggleReceiver = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (receiverBusy) {
      return;
    }

    setReceiverBusy(true);
    try {
      if (event.target.checked) {
        await startRemoteReceiver();
      } else {
        await stopRemoteReceiver();
      }
    } catch (error) {
      showErrorSnackbar(error);
    } finally {
      setReceiverBusy(false);
    }
  };

  const handleStylingModeChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void setStylingMode(value === "" ? null : (value as StylingMode));
  };

  const receiverSummary = receiverStatus?.enabled
    ? intl.formatMessage(
        {
          defaultMessage:
            "Listening on {address}:{port}. Pairing code: {code}.",
        },
        {
          address: receiverStatus.listenAddress ?? "0.0.0.0",
          port: receiverStatus.port ?? "unknown",
          code: receiverStatus.pairingCode,
        },
      )
    : intl.formatMessage({
        defaultMessage:
          "Enable receiver mode on the target machine so paired senders can deliver final transcript text locally.",
      });

  const remoteTargetSummary =
    pairedDevices.length > 0
      ? intl.formatMessage({
          defaultMessage:
            "Route finalized dictation to a paired desktop instead of inserting locally.",
        })
      : intl.formatMessage({
          defaultMessage:
            "No paired remote devices yet. Pair a receiver before enabling remote output.",
        });

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

          <SettingSection
            title={<FormattedMessage defaultMessage="Real-time output" />}
            description={
              <FormattedMessage defaultMessage="Stream dictation text as you speak instead of pasting all at once when you stop. Only applies to Verbatim mode with supported providers." />
            }
            action={
              <Switch
                edge="end"
                checked={realtimeOutputEnabled}
                onChange={handleToggleRealtimeOutput}
              />
            }
          />

          <SettingSection
            title={<FormattedMessage defaultMessage="Remote receiver" />}
            description={receiverSummary}
            action={
              <Switch
                edge="end"
                checked={receiverStatus?.enabled ?? false}
                disabled={receiverBusy}
                onChange={handleToggleReceiver}
              />
            }
          />

          {receiverStatus && (
            <Stack spacing={0.5} sx={{ mt: -1 }}>
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage
                  defaultMessage="Device ID: {deviceId}"
                  values={{ deviceId: receiverStatus.deviceId }}
                />
              </Typography>
              {receiverStatus.lastSenderDeviceId && (
                <Typography variant="caption" color="text.secondary">
                  <FormattedMessage
                    defaultMessage="Last sender: {senderId}"
                    values={{ senderId: receiverStatus.lastSenderDeviceId }}
                  />
                </Typography>
              )}
            </Stack>
          )}

          <SettingSection
            title={<FormattedMessage defaultMessage="Remote output" />}
            description={remoteTargetSummary}
            action={
              <Switch
                edge="end"
                checked={remoteOutputEnabled}
                disabled={!remoteTargetDeviceId}
                onChange={handleToggleRemoteOutput}
              />
            }
          />

          <SettingSection
            title={<FormattedMessage defaultMessage="Remote target device" />}
            description={
              <FormattedMessage defaultMessage="Choose which paired desktop should receive finalized dictation." />
            }
            action={
              <Select<string>
                size="small"
                value={remoteTargetDeviceId ?? ""}
                onChange={handleRemoteTargetDeviceChange}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">
                  {intl.formatMessage({ defaultMessage: "Local device" })}
                </MenuItem>
                {pairedDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name}
                  </MenuItem>
                ))}
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
