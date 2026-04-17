import { Box, Stack, Typography, useTheme } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Logo } from "../common/Logo";
import { LoginForm } from "../login/LoginForm";
import { VectorField } from "../welcome/VectorField";

export default function EnterpriseWelcomePage() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <VectorField />
      <Stack
        alignItems="center"
        sx={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          width: "100%",
        }}
      >
        <Stack
          spacing={4}
          justifyContent="center"
          sx={{
            width: 520,
            maxWidth: "100%",
            height: "100%",
            backgroundColor: theme.vars?.palette.background.default,
            boxShadow: "0 0 40px rgba(0, 0, 0, 0.15)",
            ...theme.applyStyles("dark", {
              boxShadow: "0 0 40px rgba(0, 0, 0, 0.6)",
            }),
            px: 7,
            py: 6,
            overflowY: "auto",
          }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Logo width="4rem" height="4rem" />
              <Typography variant="h3" fontWeight={700}>
                Voquill
              </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage defaultMessage="Voice is your new keyboard." />
            </Typography>
          </Stack>

          <LoginForm defaultMode="signIn" hideModeSwitch />
        </Stack>
      </Stack>
    </Box>
  );
}
