import { Box, Stack, SxProps, Typography } from "@mui/material";
import { ReactNode } from "react";

type SettingSectionProps = {
  title: string;
  description: string;
  action?: ReactNode;
  sx?: SxProps;
};

export const SettingSection = ({
  title,
  description,
  action,
  sx,
}: SettingSectionProps) => {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
      sx={sx}
    >
      <Stack spacing={0.5} flex={1}>
        <Typography variant="body1" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
      {action && <Box>{action}</Box>}
    </Stack>
  );
};
