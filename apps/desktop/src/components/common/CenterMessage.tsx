import { Box, Container, Stack, Typography } from "@mui/material";
import { type ReactNode } from "react";

export type CenterMessageProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
};

export function CenterMessage({ title, subtitle, action }: CenterMessageProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
        py: 8,
      }}
    >
      <Container maxWidth="xs">
        <Stack alignItems="center" spacing={2} pb={8}>
          <Typography variant="h5" fontWeight={600} align="center">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" align="center">
              {subtitle}
            </Typography>
          )}
          {action}
        </Stack>
      </Container>
    </Box>
  );
}
