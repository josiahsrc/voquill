import { Fragment } from "react";
import { Typography } from "@mui/material";
import { useAppStore } from "../../store";
import { DICTATE_HOTKEY, getHotkeyCombosForAction } from "../../utils/keyboard.utils";
import { HotkeyBadge } from "./HotkeyBadge";

export const DictationInstruction = () => {
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY)
  );

  if (combos.length === 0) {
    return null;
  }

  return (
    <Typography variant="body2" color="text.secondary">
      Press {combos.length > 1 ? "one of " : ""}
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
      {" to start dictating."}
    </Typography>
  );
};
