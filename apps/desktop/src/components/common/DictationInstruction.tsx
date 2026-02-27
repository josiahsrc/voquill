import { Fragment } from "react";
import { Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { HotkeyBadge } from "./HotkeyBadge";

export const DictationInstruction = () => {
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );

  if (combos.length === 0) {
    return null;
  }

  const hotkeys = (
    <>
      {combos.map((combo, index) => {
        const key = combo.join("|");
        const isLast = index === combos.length - 1;
        const separator = (() => {
          if (isLast) {
            return "";
          }
          if (combos.length === 2) {
            return " or ";
          }
          if (index === combos.length - 2) {
            return ", or ";
          }
          return ", ";
        })();

        return (
          <Fragment key={key}>
            <HotkeyBadge keys={combo} sx={{ mx: 0.25 }} />
            {separator}
          </Fragment>
        );
      })}
    </>
  );

  return (
    <Typography variant="body2" color="text.secondary" component="div">
      {combos.length === 1 ? (
        <FormattedMessage
          defaultMessage="Press {hotkeys} to dictate anywhere."
          values={{ hotkeys }}
        />
      ) : (
        <FormattedMessage
          defaultMessage="Press one of {hotkeys} to dictate anywhere."
          values={{ hotkeys }}
        />
      )}
    </Typography>
  );
};
