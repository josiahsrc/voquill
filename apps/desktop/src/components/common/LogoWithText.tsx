import { Stack, Typography, type StackProps } from "@mui/material";
import { Logo } from "./Logo";

export type LogoWithTextProps = StackProps;

export const LogoWithText = ({ sx, ...rest }: LogoWithTextProps) => {
  return (
    <Stack
      direction="row"
      sx={{
        display: "flex",
        alignItems: "center",
        userSelect: "none",
        ...sx,
      }}
      {...rest}
    >
      <Logo sx={{ mr: 1 }} />
      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{
          userSelect: "none",
          display: { xs: "none", sm: "block" },
        }}
      >
        Voquill
      </Typography>
    </Stack>
  );
};
