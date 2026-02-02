import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { getPrettyKeyName } from "../../utils/keyboard.utils";

type HotkeyBadgeProps = {
  keys: string[];
  onClick?: () => void;
  sx?: SxProps<Theme>;
};

export const HotkeyBadge = ({ keys, onClick, sx }: HotkeyBadgeProps) => {
  const label = keys.map(getPrettyKeyName).join(" + ");

  return (
    <Box
      onClick={onClick}
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
        ...(onClick && {
          cursor: "pointer",
          "&:hover": {
            bgcolor: "action.hover",
          },
        }),
        ...sx,
      }}
    >
      {label}
    </Box>
  );
};
