import {
  Box,
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
  Switch,
  Typography,
} from "@mui/material";
import { AppTarget } from "@voquill/types";
import type { ChangeEvent } from "react";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  setAppTargetInsertionMethod,
  setAppTargetPasteKeybind,
  setAppTargetTypingSpeed,
} from "../../actions/app-target.actions";
import { updateUserPreferences } from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyUserPreferences } from "../../utils/user.utils";
import { StorageImage } from "../common/StorageImage";

export const AppKeybindingsDialog = () => {
  const open = useAppStore((state) => state.settings.appKeybindingsDialogOpen);
  const appTargets = useAppStore((state) => state.appTargetById);
  const defaultPasteKeybind = useAppStore(
    (state) => getMyUserPreferences(state)?.pasteKeybind ?? "ctrl+v",
  );
  const defaultInsertionMethod = useAppStore(
    (state) => getMyUserPreferences(state)?.insertionMethod ?? "paste",
  );
  const defaultTypingSpeedMs = useAppStore(
    (state) => getMyUserPreferences(state)?.typingSpeedMs ?? 5,
  );

  const sortedTargets = useMemo(
    () =>
      Object.values(appTargets).sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      ),
    [appTargets],
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.appKeybindingsDialogOpen = false;
    });
  };

  const handleDefaultChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void updateUserPreferences((prefs) => {
      prefs.pasteKeybind = value === "ctrl+v" ? null : value;
    });
  };

  const handleDefaultInsertionMethodChange = (
    event: SelectChangeEvent<string>,
  ) => {
    const value = event.target.value;
    void updateUserPreferences((prefs) => {
      prefs.insertionMethod = value === "paste" ? null : value;
    });
  };

  const handleDefaultTypingSpeedChange = (
    _: Event,
    value: number | number[],
  ) => {
    const num = Array.isArray(value) ? value[0] : value;
    void updateUserPreferences((prefs) => {
      prefs.typingSpeedMs = num;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage defaultMessage="Text Insertion Options" />
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage defaultMessage="Choose how Voquill inserts text and which paste shortcut to use when paste insertion is selected." />
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            backgroundColor: "level1",
            mb: 2,
            borderRadius: 1,
            px: 1.5,
            py: 1,
          }}
        >
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="body2">
              <FormattedMessage defaultMessage="Default insertion method" />
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <FormattedMessage defaultMessage="How text is inserted into applications" />
            </Typography>
          </Stack>
          <Select
            value={defaultInsertionMethod}
            onChange={handleDefaultInsertionMethodChange}
            size="small"
            variant="outlined"
            sx={{ minWidth: 170, flexShrink: 0 }}
          >
            <MenuItem value="paste">
              <FormattedMessage defaultMessage="Paste (clipboard)" />
            </MenuItem>
            <MenuItem value="type">
              <FormattedMessage defaultMessage="Simulated typing" />
            </MenuItem>
          </Select>
        </Stack>
        {defaultInsertionMethod === "type" && (
          <Stack
            sx={{
              backgroundColor: "level1",
              mb: 2,
              borderRadius: 1,
              px: 1.5,
              py: 1,
            }}
          >
            <Typography variant="body2">
              <FormattedMessage defaultMessage="Default simulated typing speed" />
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Slider
                value={defaultTypingSpeedMs}
                onChange={handleDefaultTypingSpeedChange}
                min={1}
                max={40}
                step={1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}ms`}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        )}
        {defaultInsertionMethod === "paste" && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              backgroundColor: "level1",
              mb: 2,
              borderRadius: 1,
              px: 1.5,
              py: 1,
            }}
          >
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body2">
                <FormattedMessage defaultMessage="Default paste binding" />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage defaultMessage="Used for unregistered apps and as the default for new apps" />
              </Typography>
            </Stack>
            <Select
              value={defaultPasteKeybind}
              onChange={handleDefaultChange}
              size="small"
              variant="outlined"
              sx={{ minWidth: 170, flexShrink: 0 }}
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
          </Stack>
        )}
        {sortedTargets.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            <FormattedMessage defaultMessage="No apps registered yet. Start dictating in an app and it will appear here." />
          </Typography>
        ) : (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ px: 1, mb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage defaultMessage="App" />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage defaultMessage="Insertion method" />
              </Typography>
            </Stack>
            {sortedTargets.map((target) => (
              <AppKeybindingRow
                key={target.id}
                target={target}
                defaultInsertionMethod={defaultInsertionMethod}
                defaultPasteKeybind={defaultPasteKeybind}
                defaultTypingSpeedMs={defaultTypingSpeedMs}
              />
            ))}
          </>
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

type AppKeybindingRowProps = {
  target: AppTarget;
  defaultInsertionMethod: string;
  defaultPasteKeybind: string;
  defaultTypingSpeedMs: number;
};

const pasteKeybindLabel = (keybind: string) => {
  switch (keybind) {
    case "ctrl+shift+v":
      return "Ctrl+Shift+V";
    case "shift+insert":
      return "Shift+Insert";
    default:
      return "Ctrl+V";
  }
};

const AppKeybindingRow = ({
  target,
  defaultInsertionMethod,
  defaultPasteKeybind,
  defaultTypingSpeedMs,
}: AppKeybindingRowProps) => {
  const intl = useIntl();
  const pasteKeybindValue = target.pasteKeybind ?? "default";
  const insertionMethodValue = target.insertionMethod ?? "default";
  const effectiveInsertionMethod =
    target.insertionMethod ?? defaultInsertionMethod;
  const typingSpeedValue = target.typingSpeedMs ?? defaultTypingSpeedMs;
  const useDefaultTypingSpeed = target.typingSpeedMs == null;
  const defaultInsertionMethodLabel =
    defaultInsertionMethod === "type"
      ? intl.formatMessage({ defaultMessage: "Simulated typing" })
      : intl.formatMessage({ defaultMessage: "Paste" });

  const handlePasteKeybindChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void setAppTargetPasteKeybind(
      target.id,
      value === "default" ? null : value,
    );
  };

  const handleInsertionMethodChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void setAppTargetInsertionMethod(
      target.id,
      value === "default" ? null : value,
    );
  };

  const handleTypingSpeedChange = (_: Event, value: number | number[]) => {
    const num = Array.isArray(value) ? value[0] : value;
    void setAppTargetTypingSpeed(target.id, num);
  };

  const handleUseDefaultTypingSpeedChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void setAppTargetTypingSpeed(
      target.id,
      event.target.checked ? null : defaultTypingSpeedMs,
    );
  };

  const showPasteKeybind = effectiveInsertionMethod === "paste";
  const showSpeedSlider = effectiveInsertionMethod === "type";

  return (
    <Stack
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1, px: 1.5, py: 1 }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ minWidth: 0 }}
        >
          <Box
            sx={{
              overflow: "hidden",
              borderRadius: 0.75,
              minWidth: 32,
              minHeight: 32,
              maxWidth: 32,
              maxHeight: 32,
              bgcolor: "level2",
              flexShrink: 0,
            }}
          >
            {target.iconPath && (
              <StorageImage
                path={target.iconPath}
                alt={
                  target.name ??
                  intl.formatMessage({ defaultMessage: "App icon" })
                }
                size={32}
              />
            )}
          </Box>
          <Typography variant="body2" noWrap>
            {target.name}
          </Typography>
        </Stack>
        <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage defaultMessage="Insertion method" />
          </Typography>
          <Select
            value={insertionMethodValue}
            onChange={handleInsertionMethodChange}
            size="small"
            variant="outlined"
            sx={{ minWidth: 190, flexShrink: 0 }}
          >
            <MenuItem value="default">
              {intl.formatMessage(
                { defaultMessage: "Use default ({method})" },
                { method: defaultInsertionMethodLabel },
              )}
            </MenuItem>
            <MenuItem value="paste">
              <FormattedMessage defaultMessage="Paste" />
            </MenuItem>
            <MenuItem value="type">
              <FormattedMessage defaultMessage="Simulated typing" />
            </MenuItem>
          </Select>
        </Stack>
      </Stack>
      {showPasteKeybind && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 1 }}
        >
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage defaultMessage="Paste binding" />
          </Typography>
          <Select
            value={pasteKeybindValue}
            onChange={handlePasteKeybindChange}
            size="small"
            variant="outlined"
            sx={{ minWidth: 190, flexShrink: 0 }}
          >
            <MenuItem value="default">
              {intl.formatMessage(
                { defaultMessage: "Use default ({keybind})" },
                { keybind: pasteKeybindLabel(defaultPasteKeybind) },
              )}
            </MenuItem>
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
        </Stack>
      )}
      {showSpeedSlider && (
        <Stack sx={{ mt: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              <FormattedMessage defaultMessage="Simulated typing speed" />
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage defaultMessage="Use default" />
              </Typography>
              <Switch
                size="small"
                checked={useDefaultTypingSpeed}
                onChange={handleUseDefaultTypingSpeedChange}
              />
            </Stack>
          </Stack>
          {!useDefaultTypingSpeed && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 80 }}
              >
                <FormattedMessage defaultMessage="Speed" />
              </Typography>
              <Slider
                value={typingSpeedValue}
                onChange={handleTypingSpeedChange}
                min={1}
                max={40}
                step={1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}ms`}
                sx={{ flex: 1 }}
              />
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
};
