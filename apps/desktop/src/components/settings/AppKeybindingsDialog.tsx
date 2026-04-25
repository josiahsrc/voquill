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
  Typography,
} from "@mui/material";
import { AppTarget } from "@voquill/types";
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
    (state) => getMyUserPreferences(state)?.typingSpeedMs ?? 40,
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
        <FormattedMessage defaultMessage="App Paste Bindings" />
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage defaultMessage="Different applications use different keyboard shortcuts for pasting. Select the keybind that works best for each app." />
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
              <FormattedMessage defaultMessage="Default typing speed" />
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Slider
                value={defaultTypingSpeedMs}
                onChange={handleDefaultTypingSpeedChange}
                min={10}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}ms`}
                sx={{ flex: 1 }}
              />
            </Stack>
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
                <FormattedMessage defaultMessage="Paste keybind" />
              </Typography>
            </Stack>
            {sortedTargets.map((target) => (
              <AppKeybindingRow key={target.id} target={target} />
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
};

const AppKeybindingRow = ({ target }: AppKeybindingRowProps) => {
  const intl = useIntl();
  const pasteKeybindValue = target.pasteKeybind ?? "ctrl+v";
  const insertionMethodValue = target.insertionMethod ?? "default";
  const typingSpeedValue = target.typingSpeedMs ?? 40;

  const handlePasteKeybindChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void setAppTargetPasteKeybind(target.id, value === "ctrl+v" ? null : value);
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

  const showSpeedSlider = insertionMethodValue === "type";

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
        <Select
          value={pasteKeybindValue}
          onChange={handlePasteKeybindChange}
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
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 1 }}
      >
        <Typography variant="caption" color="text.secondary">
          <FormattedMessage defaultMessage="Insertion" />
        </Typography>
        <Select
          value={insertionMethodValue}
          onChange={handleInsertionMethodChange}
          size="small"
          variant="outlined"
          sx={{ minWidth: 140, flexShrink: 0 }}
        >
          <MenuItem value="default">
            <FormattedMessage defaultMessage="Use default" />
          </MenuItem>
          <MenuItem value="paste">
            <FormattedMessage defaultMessage="Paste" />
          </MenuItem>
          <MenuItem value="type">
            <FormattedMessage defaultMessage="Type" />
          </MenuItem>
        </Select>
      </Stack>
      {showSpeedSlider && (
        <Stack sx={{ mt: 1 }}>
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
              min={10}
              max={100}
              step={5}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}ms`}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};
