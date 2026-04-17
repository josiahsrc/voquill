import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { produceAppState } from "../../store";
import { Logo } from "../common/Logo";
import { VectorField } from "../welcome/VectorField";
import { EnterpriseLoginDialog } from "./EnterpriseLoginDialog";

export default function EnterpriseWelcomePage() {
  const theme = useTheme();
  const [loginOpen, setLoginOpen] = useState(false);

  const handleOpenLogin = () => {
    produceAppState((draft) => {
      draft.login.mode = "signIn";
    });
    setLoginOpen(true);
  };

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
        justifyContent="center"
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: "100%",
          width: "100%",
          px: 3,
          py: 6,
        }}
      >
        <Stack
          spacing={6}
          alignItems="center"
          textAlign="center"
          sx={{
            maxWidth: 420,
            position: "relative",
            backgroundColor: theme.vars?.palette.background.default,
            boxShadow: `0 0 120px 120px ${theme.vars?.palette.background.default}`,
            borderRadius: 8,
            p: 4,
          }}
        >
          <Stack spacing={2} alignItems="center">
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

          <Stack width="100%">
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleOpenLogin}
            >
              <FormattedMessage defaultMessage="Sign in" />
            </Button>
          </Stack>
        </Stack>
      </Stack>
      <EnterpriseLoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
      />
    </Box>
  );
}
