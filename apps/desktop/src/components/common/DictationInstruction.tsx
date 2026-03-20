import { Typography } from "@mui/material";
import { Stack } from "@mui/system";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { HotkeyBadge } from "./HotkeyBadge";

export const DictationInstruction = () => {
  const firstCombo = useAppStore((state) => {
    const combos = getHotkeyCombosForAction(state, DICTATE_HOTKEY);
    return combos.length > 0 ? combos[0] : null;
  });

  if (!firstCombo) {
    return null;
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="body2" color="text.secondary" component="div">
        <FormattedMessage defaultMessage="Press your hotkey to dictate anywhere" />
      </Typography>
      <HotkeyBadge keys={firstCombo} sx={{ flexShrink: 0 }} />
    </Stack>
  );
};
