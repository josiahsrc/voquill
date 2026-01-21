import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Button,
  Divider,
  IconButton,
  Link,
  Stack,
  TextField,
} from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import { SignInWithGoogleButton } from "./ProviderButtons";
import { setMode, submitSignUp } from "../../actions/login.actions";
import {
  getCanSubmitSignUp,
  getSignUpConfirmPasswordValidation,
  getSignUpEmailValidation,
  getSignUpPasswordValidation,
} from "../../utils/login.utils";

type SignUpFormProps = {
  hideGoogleButton?: boolean;
  hideModeSwitch?: boolean;
};

export const SignUpForm = ({
  hideGoogleButton = false,
  hideModeSwitch = false,
}: SignUpFormProps) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const email = useAppStore((state) => state.login.email);
  const password = useAppStore((state) => state.login.password);
  const confirmPassword = useAppStore((state) => state.login.confirmPassword);
  const canSubmit = useAppStore((state) => getCanSubmitSignUp(state));

  const emailValidation = useAppStore((state) =>
    getSignUpEmailValidation(state),
  );
  const passwordValidation = useAppStore((state) =>
    getSignUpPasswordValidation(state),
  );
  const confirmPasswordValidation = useAppStore((state) =>
    getSignUpConfirmPasswordValidation(state),
  );

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

  const handleChangeConfirmPassword = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    produceAppState((state) => {
      state.login.confirmPassword = event.target.value;
    });
  };

  const handleClickLogin = () => {
    setMode("signIn");
  };

  const handleSubmit = async () => {
    await submitSignUp();
  };

  return (
    <Stack spacing={2}>
      {!hideGoogleButton && (
        <>
          <SignInWithGoogleButton />
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
        error={!!emailValidation}
        helperText={emailValidation}
        size="small"
      />
      <TextField
        label={<FormattedMessage defaultMessage="Password" />}
        type={passwordVisible ? "text" : "password"}
        fullWidth
        value={password}
        onChange={handleChangePassword}
        error={!!passwordValidation}
        helperText={passwordValidation}
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
      <TextField
        label={<FormattedMessage defaultMessage="Confirm password" />}
        type={confirmPasswordVisible ? "text" : "password"}
        fullWidth
        value={confirmPassword}
        onChange={handleChangeConfirmPassword}
        error={!!confirmPasswordValidation}
        helperText={confirmPasswordValidation}
        size="small"
        InputProps={{
          endAdornment: (
            <IconButton
              onClick={() => setConfirmPasswordVisible((v) => !v)}
              tabIndex={-1}
              size="small"
            >
              {!confirmPasswordVisible ? <VisibilityOff /> : <Visibility />}
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
        <FormattedMessage defaultMessage="Create account" />
      </Button>

      {!hideModeSwitch && (
        <Link
          component="button"
          onClick={handleClickLogin}
          sx={{ alignSelf: "center" }}
        >
          <FormattedMessage defaultMessage="Already have an account? Log in" />
        </Link>
      )}
    </Stack>
  );
};
