import { VpnKey } from "@mui/icons-material";
import { Button } from "@mui/material";
import type { OidcProvider } from "@repo/types";
import { submitSignInWithSso } from "../../actions/login.actions";
import { useAppStore } from "../../store";

type SsoButtonProps = {
  provider: OidcProvider;
};

export const SsoButton = ({ provider }: SsoButtonProps) => {
  const loading = useAppStore((state) => state.login.status === "loading");

  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={<VpnKey />}
      disabled={loading}
      onClick={() => submitSignInWithSso(provider.id)}
    >
      {provider.name}
    </Button>
  );
};
