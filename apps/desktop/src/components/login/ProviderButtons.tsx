import { Google } from "@mui/icons-material";
import { Button } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import { submitSignInWithGoogle } from "../../actions/login.actions";

export const SignInWithGoogleButton = () => {
  const loading = useAppStore((state) => state.login.status === "loading");

  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={<Google />}
      disabled={loading}
      onClick={submitSignInWithGoogle}
    >
      <FormattedMessage defaultMessage="Continue with Google" />
    </Button>
  );
};
