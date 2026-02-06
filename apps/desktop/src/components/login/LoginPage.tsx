import { Button, Card, Stack } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { LoginForm } from "./LoginForm";
import { ArrowBack } from "@mui/icons-material";
import { useAppStore } from "../../store";

export default function LoginPage() {
  const isEnterprise = useAppStore((state) => state.isEnterprise);
  const oidcProviders = useAppStore((state) => state.oidcProviders);

  return (
    <Stack sx={{ p: 2, minHeight: "100%", pb: { xs: 4, md: 8 } }}>
      <Stack
        spacing={2}
        alignItems="center"
        sx={{
          m: "auto",
          width: "100%",
          maxWidth: 520,
        }}
      >
        <Card
          sx={{
            p: { xs: 2, sm: 4 },
            boxShadow: 6,
            width: "100%",
            overflow: "hidden",
          }}
        >
          <LoginForm
            hideGoogleButton={isEnterprise}
            oidcProviders={oidcProviders}
          />
        </Card>
        <Button component={Link} to="/" startIcon={<ArrowBack />}>
          <FormattedMessage defaultMessage="Go back" />
        </Button>
      </Stack>
    </Stack>
  );
}
