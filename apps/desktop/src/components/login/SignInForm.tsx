import {
  Button,
  Divider,
  IconButton,
  Link,
  Stack,
  TextField,
} from "@mui/material";
import type { OidcProvider } from "@repo/types";
import { FormattedMessage } from "react-intl";
import { SignInWithGoogleButton } from "./ProviderButtons";
import { SsoButton } from "./SsoButton";
import { setMode, submitSignIn } from "../../actions/login.actions";
import { produceAppState, useAppStore } from "../../store";
import { getCanSubmitLogin } from "../../utils/login.utils";
import { useState } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";

type SignInFormProps = {
  hideGoogleButton?: boolean;
  oidcProviders?: OidcProvider[];
};

export const SignInForm = ({
  hideGoogleButton = false,
  oidcProviders = [],
}: SignInFormProps) => {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const email = useAppStore((state) => state.login.email);
  const password = useAppStore((state) => state.login.password);
  const canSubmit = useAppStore((state) => getCanSubmitLogin(state));

  const handleClickReset = () => {
    setMode("resetPassword");
  };

  const handleClickRegister = () => {
    setMode("signUp");
  };

  const handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    produceAppState((state) => {
      state.login.email = event.target.value;
    });
  };

  const handleChangePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    produceAppState((state) => {
      state.login.password = event.target.value;
    });
  };

  const handleSubmit = async () => {
    await submitSignIn();
  };

  const hasSsoProviders = oidcProviders.length > 0;

  return (
    <Stack spacing={2}>
      {!hideGoogleButton && (
        <>
          <SignInWithGoogleButton />
          {!hasSsoProviders && (
            <Divider>
              <FormattedMessage defaultMessage="or" />
            </Divider>
          )}
        </>
      )}

      {hasSsoProviders && (
        <>
          {oidcProviders.map((provider) => (
            <SsoButton key={provider.id} provider={provider} />
          ))}
          <Divider>
            <FormattedMessage defaultMessage="or" />
          </Divider>
        </>
      )}

      <TextField
        label={<FormattedMessage defaultMessage="Email" />}
        type="email"
        fullWidth
        value={email}
        onChange={handleChangeEmail}
        size="small"
      />
      <TextField
        label={<FormattedMessage defaultMessage="Password" />}
        type={passwordVisible ? "text" : "password"}
        fullWidth
        value={password}
        onChange={handleChangePassword}
        size="small"
        InputProps={{
          endAdornment: (
            <IconButton
              onClick={() => setPasswordVisible((v) => !v)}
              tabIndex={-1}
              size="small"
            >
              {!passwordVisible ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          ),
        }}
      />

      <Button
        variant="contained"
        fullWidth
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        <FormattedMessage defaultMessage="Log in" />
      </Button>

      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Link component="button" onClick={handleClickReset}>
          <FormattedMessage defaultMessage="Forgot?" />
        </Link>
        <Link component="button" onClick={handleClickRegister}>
          <FormattedMessage defaultMessage="Create account" />
        </Link>
      </Stack>
    </Stack>
  );
};
