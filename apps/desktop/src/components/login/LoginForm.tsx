import { Collapse, Stack, Typography } from "@mui/material";
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

export const LoginForm = () => {
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

  return (
    <Stack spacing={1.5}>
      <Typography variant="body1" fontWeight="bold">
        {mode === "signIn" && "Sign in"}
        {mode === "signUp" && "Sign up"}
        {mode === "resetPassword" && "Reset password"}
        {mode === "passwordResetSent" && "Email sent"}
      </Typography>

      <TransitionGroup>
        {mode === "signIn" && (
          <Collapse key="signIn" timeout={400} unmountOnExit>
            <SignInForm />
          </Collapse>
        )}
        {mode === "signUp" && (
          <Collapse key="signUp" timeout={400} unmountOnExit>
            <SignUpForm />
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

      <Typography
        variant="body2"
        color="textSecondary"
        textAlign="center"
        sx={{ maxWidth: 300, alignSelf: "center", fontSize: "0.75rem" }}
      >
        By using this service, you agree to our{" "}
        <a
          href="/terms"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Terms & Conditions
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Privacy Policy
        </a>
      </Typography>

      {errorMessage && (
        <Typography color="error" textAlign="center">
          {errorMessage}
        </Typography>
      )}
    </Stack>
  );
};
