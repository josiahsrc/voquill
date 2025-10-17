import { Box, type BoxProps } from "@mui/material";
import AppLogo from "../../assets/app-logo.svg?react";

export type LogoProps = BoxProps;

export const Logo = ({
  sx,
  width = "2.2rem",
  height = "2.2rem",
  ...rest
}: LogoProps) => {
  return (
    <Box
      component={AppLogo}
      width={width}
      height={height}
      sx={{
        color: "primary.main",
        ...sx,
      }}
      {...rest}
    />
  );
};
