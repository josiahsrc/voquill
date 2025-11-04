import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { getPrettyKeyName } from "../../utils/keyboard.utils";

type HotkeyBadgeProps = {
  keys: string[];
  sx?: SxProps<Theme>;
};

export const HotkeyBadge = ({ keys, sx }: HotkeyBadgeProps) => {
  const label = keys.map(getPrettyKeyName).join(" + ");

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0.5,
        px: 1,
        py: 0.25,
        fontWeight: 600,
        bgcolor: (theme) => theme.vars?.palette.level1,
        ...sx,
      }}
    >
      {label}
    </Box>
  );
};
