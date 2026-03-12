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
  TextField,
  Typography,
} from "@mui/material";
import type {
  DictationPillVisibility,
  PairedRemoteDevice,
  RemoteDevicePlatform,
  RemoteDeviceRole,
  StylingMode,
} from "@repo/types";
import { ChangeEvent, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import { sendRemoteTestOutput } from "../../actions/remote-output.actions";
import { upsertPairedRemoteDevice } from "../../actions/paired-remote-device.actions";
import {
  startRemoteReceiver,
  refreshRemoteReceiverStatus,
  stopRemoteReceiver,
} from "../../actions/remote-receiver.actions";
import {
  setDictationPillVisibility,
  setIgnoreUpdateDialog,
  setIncognitoModeEnabled,
  setIncognitoModeIncludeInStats,
  setRealtimeOutputEnabled,
  setRemoteOutputEnabled,
  setRemoteReceiverAutoStart,
  setRemoteReceiverPort,
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
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [pairName, setPairName] = useState("");
  const [pairDeviceId, setPairDeviceId] = useState("");
  const [pairAddress, setPairAddress] = useState("");
  const [pairSecret, setPairSecret] = useState("");
  const [pairPlatform, setPairPlatform] =
    useState<RemoteDevicePlatform>("windows");
  const [pairRole, setPairRole] = useState<RemoteDeviceRole>("receiver");
  const [testBusy, setTestBusy] = useState(false);
  const [
    open,
    ignoreUpdateDialog,
    incognitoModeEnabled,
    incognitoIncludeInStats,
    dictationPillVisibility,
    realtimeOutputEnabled,
    remoteOutputEnabled,
    remoteTargetDeviceId,
    remoteReceiverPort,
    remoteReceiverAutoStart,
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
      prefs?.remoteReceiverPort ?? null,
      prefs?.remoteReceiverAutoStart ?? false,
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
        await startRemoteReceiver(remoteReceiverPort);
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

  const handleRemoteReceiverPortChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = event.target.value.trim();
    const nextValue = raw === "" ? null : Number(raw);
    if (raw !== "" && (!Number.isInteger(nextValue) || nextValue <= 0)) {
      showErrorSnackbar("Receiver port must be a positive integer.");
      return;
    }
    void setRemoteReceiverPort(nextValue);
  };

  const handleRemoteReceiverAutoStartChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void setRemoteReceiverAutoStart(event.target.checked);
  };

  const openPairDialog = (device?: PairedRemoteDevice) => {
    if (device) {
      setEditingDeviceId(device.id);
      setPairName(device.name);
      setPairDeviceId(device.id);
      setPairAddress(device.lastKnownAddress ?? "");
      setPairSecret(device.sharedSecret);
      setPairPlatform(device.platform);
      setPairRole(device.role);
    } else {
      setEditingDeviceId(null);
      setPairName("");
      setPairDeviceId("");
      setPairAddress("");
      setPairSecret("");
      setPairPlatform("windows");
      setPairRole("receiver");
    }
    setPairDialogOpen(true);
  };

  const closePairDialog = () => {
    setPairDialogOpen(false);
    setEditingDeviceId(null);
    setPairName("");
    setPairDeviceId("");
    setPairAddress("");
    setPairSecret("");
    setPairPlatform("windows");
    setPairRole("receiver");
  };

  const handleSaveManualPair = async () => {
    const name = pairName.trim();
    const deviceId = pairDeviceId.trim();
    const address = pairAddress.trim();
    const secret = pairSecret.trim();
    const requiresAddress = pairRole === "receiver" || pairRole === "both";

    if (!name || !deviceId || !secret || (requiresAddress && !address)) {
      showErrorSnackbar(
        requiresAddress
          ? "Name, device ID, receiver address, and shared secret are required."
          : "Name, device ID, and shared secret are required.",
      );
      return;
    }

    try {
      const existing = pairedDevices.find((device) => device.id === deviceId);
      await upsertPairedRemoteDevice({
        id: deviceId,
        name,
        platform: pairPlatform,
        role: pairRole,
        sharedSecret: secret,
        pairedAt: existing?.pairedAt ?? new Date().toISOString(),
        lastSeenAt: null,
        lastKnownAddress: requiresAddress ? address : null,
        trusted: true,
      });
      closePairDialog();
    } catch (error) {
      showErrorSnackbar(error);
    }
  };

  const handleSendTest = async () => {
    if (!remoteTargetDeviceId) {
      showErrorSnackbar("Select a remote target device first.");
      return;
    }
    if (testBusy) {
      return;
    }

    setTestBusy(true);
    try {
      await sendRemoteTestOutput(remoteTargetDeviceId);
      showSnackbar("Remote test message sent.");
    } catch (error) {
      showErrorSnackbar(error);
    } finally {
      setTestBusy(false);
    }
  };

  const addressLabel =
    pairRole === "sender"
      ? intl.formatMessage({ defaultMessage: "Sender address (optional)" })
      : intl.formatMessage({ defaultMessage: "Receiver address" });

  const addressHelperText =
    pairRole === "sender"
      ? intl.formatMessage({
          defaultMessage:
            "Optional for now. Only receiver targets need an address for delivery.",
        })
      : intl.formatMessage({
          defaultMessage: "Example: 192.168.1.25:43123",
        });

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

  const lastDeliveryTimeLabel = receiverStatus?.lastDeliveryAt
    ? new Date(receiverStatus.lastDeliveryAt).toLocaleString()
    : null;

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

  useEffect(() => {
    if (!open) {
      return;
    }

    void refreshRemoteReceiverStatus().catch(() => undefined);
    const intervalId = window.setInterval(() => {
      void refreshRemoteReceiverStatus().catch(() => undefined);
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [open]);

  return (
    <>
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

          <SettingSection
            title={<FormattedMessage defaultMessage="Receiver port" />}
            description={
              <FormattedMessage defaultMessage="Leave blank to auto-assign a port, or set a fixed port and restart the receiver after changing it." />
            }
            action={
              <TextField
                size="small"
                value={remoteReceiverPort ?? ""}
                onChange={handleRemoteReceiverPortChange}
                placeholder={intl.formatMessage({
                  defaultMessage: "Auto",
                })}
                sx={{ width: 120 }}
              />
            }
          />

          <SettingSection
            title={<FormattedMessage defaultMessage="Start receiver automatically" />}
            description={
              <FormattedMessage defaultMessage="When enabled, Voquill will start the remote receiver automatically on launch using the saved receiver port." />
            }
            action={
              <Switch
                edge="end"
                checked={remoteReceiverAutoStart}
                onChange={handleRemoteReceiverAutoStartChange}
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
              {receiverStatus.enabled && (
                <Typography variant="caption" color="text.secondary">
                  <FormattedMessage
                    defaultMessage="Connect address: {address}:{port}"
                    values={{
                      address: receiverStatus.listenAddress ?? "127.0.0.1",
                      port: receiverStatus.port ?? "unknown",
                    }}
                  />
                </Typography>
              )}
              {receiverStatus.lastSenderDeviceId && (
                <Typography variant="caption" color="text.secondary">
                  <FormattedMessage
                    defaultMessage="Last sender: {senderId}"
                    values={{ senderId: receiverStatus.lastSenderDeviceId }}
                  />
                </Typography>
              )}
              {receiverStatus.lastDeliveryStatus && (
                <Typography variant="caption" color="text.secondary">
                  {lastDeliveryTimeLabel ? (
                    <FormattedMessage
                      defaultMessage="Last delivery: {status} at {timestamp}"
                      values={{
                        status: receiverStatus.lastDeliveryStatus,
                        timestamp: lastDeliveryTimeLabel,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      defaultMessage="Last delivery: {status}"
                      values={{
                        status: receiverStatus.lastDeliveryStatus,
                      }}
                    />
                  )}
                </Typography>
              )}
              {receiverStatus.lastError && (
                <Typography
                  variant="caption"
                  color="error.main"
                  sx={{ wordBreak: "break-word" }}
                >
                  <FormattedMessage
                    defaultMessage="Last error: {message}"
                    values={{ message: receiverStatus.lastError }}
                  />
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage defaultMessage="Automated pairing is still in progress. For now, add trusted devices manually on both machines using the device IDs, receiver address, and a shared secret." />
              </Typography>
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

          <SettingSection
            title={<FormattedMessage defaultMessage="Remote transport test" />}
            description={
              <FormattedMessage defaultMessage="Send a fixed test message to the selected remote target to verify transport without using dictation." />
            }
            action={
              <Button
                size="small"
                variant="outlined"
                onClick={handleSendTest}
                disabled={!remoteTargetDeviceId || testBusy}
              >
                <FormattedMessage defaultMessage="Send test" />
              </Button>
            }
          />

          <SettingSection
            title={<FormattedMessage defaultMessage="Trusted remote devices" />}
            description={
              <FormattedMessage defaultMessage="Add a trusted receiver manually while the automated pairing flow is under construction." />
            }
            action={
              <Button size="small" variant="outlined" onClick={openPairDialog}>
                <FormattedMessage defaultMessage="Add device" />
              </Button>
            }
          />

          {pairedDevices.length > 0 && (
            <Stack spacing={1} sx={{ mt: -1 }}>
              {pairedDevices.map((device) => (
                <PairedDeviceRow
                  key={device.id}
                  device={device}
                  onEdit={() => openPairDialog(device)}
                />
              ))}
            </Stack>
          )}

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

      <Dialog open={pairDialogOpen} onClose={closePairDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDeviceId ? (
            <FormattedMessage defaultMessage="Edit trusted remote device" />
          ) : (
            <FormattedMessage defaultMessage="Add trusted remote device" />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label={intl.formatMessage({ defaultMessage: "Device name" })}
              value={pairName}
              onChange={(event) => setPairName(event.target.value)}
              fullWidth
            />
            <TextField
              label={intl.formatMessage({ defaultMessage: "Device ID" })}
              value={pairDeviceId}
              onChange={(event) => setPairDeviceId(event.target.value)}
              fullWidth
            />
            <Select<RemoteDeviceRole>
              size="small"
              value={pairRole}
              onChange={(event) =>
                setPairRole(event.target.value as RemoteDeviceRole)
              }
              fullWidth
            >
              <MenuItem value="receiver">
                {intl.formatMessage({ defaultMessage: "Receiver device" })}
              </MenuItem>
              <MenuItem value="sender">
                {intl.formatMessage({ defaultMessage: "Sender device" })}
              </MenuItem>
              <MenuItem value="both">
                {intl.formatMessage({ defaultMessage: "Both roles" })}
              </MenuItem>
            </Select>
            <Select<RemoteDevicePlatform>
              size="small"
              value={pairPlatform}
              onChange={(event) =>
                setPairPlatform(event.target.value as RemoteDevicePlatform)
              }
              fullWidth
            >
              <MenuItem value="windows">
                {intl.formatMessage({ defaultMessage: "Windows" })}
              </MenuItem>
              <MenuItem value="macos">
                {intl.formatMessage({ defaultMessage: "macOS" })}
              </MenuItem>
              <MenuItem value="linux">
                {intl.formatMessage({ defaultMessage: "Linux" })}
              </MenuItem>
            </Select>
            <TextField
              label={addressLabel}
              helperText={addressHelperText}
              value={pairAddress}
              onChange={(event) => setPairAddress(event.target.value)}
              fullWidth
            />
            <TextField
              label={intl.formatMessage({ defaultMessage: "Shared secret" })}
              helperText={intl.formatMessage({
                defaultMessage:
                  "Use the same secret on both the sender and receiver device records.",
              })}
              value={pairSecret}
              onChange={(event) => setPairSecret(event.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePairDialog}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button variant="contained" onClick={handleSaveManualPair}>
            <FormattedMessage defaultMessage="Save" />
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

type PairedDeviceRowProps = {
  device: PairedRemoteDevice;
  onEdit: () => void;
};

const PairedDeviceRow = ({ device, onEdit }: PairedDeviceRowProps) => {
  return (
    <Stack
      spacing={0.25}
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1,
        backgroundColor: "level1",
        minWidth: 0,
      }}
    >
      <Typography variant="body2" fontWeight={600}>
        {device.name}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ wordBreak: "break-all" }}
      >
        <FormattedMessage
          defaultMessage="Device ID: {deviceId}"
          values={{ deviceId: device.id }}
        />
      </Typography>
      {device.lastKnownAddress && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ wordBreak: "break-all" }}
        >
          <FormattedMessage
            defaultMessage="Address: {address}"
            values={{ address: device.lastKnownAddress }}
          />
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ wordBreak: "break-word" }}
      >
        <FormattedMessage
          defaultMessage="Role: {role} • Platform: {platform}"
          values={{ role: device.role, platform: device.platform }}
        />
      </Typography>
      <Stack direction="row" justifyContent="flex-end" sx={{ pt: 0.5 }}>
        <Button size="small" onClick={onEdit}>
          <FormattedMessage defaultMessage="Edit" />
        </Button>
      </Stack>
    </Stack>
  );
};
