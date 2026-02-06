import { Google, VpnKey } from "@mui/icons-material";
import { Button, Stack } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  submitSignInWithGoogle,
  submitSignInWithSso,
} from "../../actions/login.actions";
import { useAppStore } from "../../store";

type OidcProvidersProps = {
  onBeforeSignIn?: () => void;
  variant?: "outlined" | "contained";
};

export const OidcProviders = ({
  onBeforeSignIn,
  variant = "outlined",
}: OidcProvidersProps) => {
  const isEnterprise = useAppStore((state) => state.isEnterprise);
  const oidcProviders = useAppStore((state) => state.oidcProviders);
  const loading = useAppStore((state) => state.login.status === "loading");

  const handleGoogleClick = () => {
    onBeforeSignIn?.();
    submitSignInWithGoogle();
  };

  const handleSsoClick = (providerId: string) => {
    onBeforeSignIn?.();
    submitSignInWithSso(providerId);
  };

  if (!isEnterprise) {
    return (
      <Button
        fullWidth
        variant={variant}
        startIcon={<Google />}
        disabled={loading}
        onClick={handleGoogleClick}
      >
        <FormattedMessage defaultMessage="Continue with Google" />
      </Button>
    );
  }

  if (oidcProviders.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1}>
      {oidcProviders.map((provider) => (
        <Button
          key={provider.id}
          fullWidth
          variant={variant}
          startIcon={<VpnKey />}
          disabled={loading}
          onClick={() => handleSsoClick(provider.id)}
        >
          {provider.name}
        </Button>
      ))}
    </Stack>
  );
};
