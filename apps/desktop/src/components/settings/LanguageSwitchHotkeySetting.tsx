import { CancelOutlined } from "@mui/icons-material";
import { IconButton, Stack, Switch, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  setLanguageSwitchEnabled,
  setLanguageSwitchHotkey,
} from "../../actions/user.actions";
import { useAppStore } from "../../store";
import {
  getDefaultHotkeyCombosForAction,
  LANGUAGE_SWITCH_HOTKEY,
} from "../../utils/keyboard.utils";
import { HotKey } from "../common/HotKey";

export const LanguageSwitchHotkeySetting = () => {
  const { enabled, hotkey } = useAppStore((state) => ({
    enabled: state.settings.languageSwitch.enabled,
    hotkey: state.settings.languageSwitch.hotkey,
  }));

  const defaultHotkey = getDefaultHotkeyCombosForAction(LANGUAGE_SWITCH_HOTKEY);
  const displayedHotkey = hotkey ?? (enabled ? defaultHotkey[0] : []);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabled = event.target.checked;
    void setLanguageSwitchEnabled(newEnabled);

    if (newEnabled && !hotkey) {
      void setLanguageSwitchHotkey(defaultHotkey[0] ?? null);
    }
  };

  const handleHotkeyChange = (keys: string[]) => {
    void setLanguageSwitchHotkey(keys.length > 0 ? keys : null);
  };

  const handleDisable = () => {
    void setLanguageSwitchEnabled(false);
  };

  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Stack spacing={1} flex={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body1" fontWeight="bold">
            <FormattedMessage defaultMessage="Switch dictation language" />
          </Typography>
          <Switch
            size="small"
            checked={enabled}
            onChange={handleToggle}
            inputProps={{
              "aria-label": "Enable language switching",
            }}
          />
        </Stack>
        <Typography variant="body2">
          <FormattedMessage defaultMessage="Quickly switch between your primary and secondary dictation languages." />
        </Typography>
      </Stack>
      {enabled && (
        <Stack direction="row" spacing={1} alignItems="center">
          <HotKey value={displayedHotkey} onChange={handleHotkeyChange} />
          <IconButton
            size="small"
            onClick={handleDisable}
            aria-label="Disable language switching"
          >
            <CancelOutlined color="disabled" />
          </IconButton>
        </Stack>
      )}
    </Stack>
  );
};
