import { Collapse, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useSearchParams } from "react-router-dom";
import { TransitionGroup } from "react-transition-group";
import { useOnExit } from "../../hooks/helper.hooks";
import { useConsumeQueryParams } from "../../hooks/navigation.hooks";
import { INITIAL_LOGIN_STATE, LoginMode } from "../../state/login.state";
import { produceAppState, useAppStore } from "../../store";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { ResetSentForm } from "./ResetSentForm";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { TermsNotice } from "./TermsNotice";

const mapMode = (mode: string | null): LoginMode | null => {
  if (mode === "register") return "signUp";
  if (mode === "login") return "signIn";
  return null;
};

const useMode = () => {
  const stateMode = useAppStore((state) => state.login.mode);
  const [searchParams] = useSearchParams();
  const queryMode = mapMode(searchParams.get("mode"));
  return queryMode || stateMode;
};

type LoginFormProps = {
  hideModeSwitch?: boolean;
  defaultMode?: LoginMode;
};

export const LoginForm = ({
  hideModeSwitch = false,
  defaultMode,
}: LoginFormProps) => {
  const mode = useMode();
  const errorMessage = useAppStore((state) => state.login.errorMessage);

  useOnExit(() => {
    produceAppState((draft) => {
      draft.login = INITIAL_LOGIN_STATE;
    });
  });

  useConsumeQueryParams(["mode"], ([mode]) => {
    produceAppState((draft) => {
      const mapped = mapMode(mode);
      if (mapped) {
        draft.login.mode = mapped;
      }
    });
  });

  useEffect(() => {
    if (defaultMode) {
      produceAppState((draft) => {
        draft.login.mode = defaultMode;
      });
    }
  }, [defaultMode]);

  return (
    <Stack spacing={1.5}>
      <Typography variant="body1" fontWeight="bold">
        {mode === "signIn" && <FormattedMessage defaultMessage="Sign in" />}
        {mode === "signUp" && <FormattedMessage defaultMessage="Sign up" />}
        {mode === "resetPassword" && (
          <FormattedMessage defaultMessage="Reset password" />
        )}
        {mode === "passwordResetSent" && (
          <FormattedMessage defaultMessage="Email sent" />
        )}
      </Typography>

      <TransitionGroup>
        {mode === "signIn" && (
          <Collapse key="signIn" timeout={400} unmountOnExit>
            <SignInForm />
          </Collapse>
        )}
        {mode === "signUp" && (
          <Collapse key="signUp" timeout={400} unmountOnExit>
            <SignUpForm hideModeSwitch={hideModeSwitch} />
          </Collapse>
        )}
        {mode === "resetPassword" && (
          <Collapse key="resetPassword" timeout={400} unmountOnExit>
            <ResetPasswordForm />
          </Collapse>
        )}
        {mode === "passwordResetSent" && (
          <Collapse key="passwordResetSent" timeout={400} unmountOnExit>
            <ResetSentForm />
          </Collapse>
        )}
      </TransitionGroup>

      <TermsNotice />

      {errorMessage && (
        <Typography color="error" textAlign="center">
          {errorMessage}
        </Typography>
      )}
    </Stack>
  );
};
