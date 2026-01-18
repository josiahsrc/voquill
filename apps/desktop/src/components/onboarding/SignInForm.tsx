import { ArrowForward, Email, Google } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { signOut, submitSignInWithGoogle } from "../../actions/login.actions";
import {
  goToOnboardingPage,
  setAwaitingSignInNavigation,
  setDidSignUpWithAccount,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { LoginForm } from "../login/LoginForm";
import { TermsNotice } from "../login/TermsNotice";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const SignInForm = () => {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [confirmLocalSetupOpen, setConfirmLocalSetupOpen] = useState(false);

  const auth = useAppStore((state) => state.auth);
  const loginStatus = useAppStore((state) => state.login.status);
  const awaitingSignInNavigation = useAppStore(
    (state) => state.onboarding.awaitingSignInNavigation,
  );
  const isSignedIn = Boolean(auth);

  useEffect(() => {
    if (isSignedIn && awaitingSignInNavigation) {
      setAwaitingSignInNavigation(false);
      setEmailDialogOpen(false);
      setDidSignUpWithAccount(true);
      goToOnboardingPage("userDetails");
    }
  }, [isSignedIn, awaitingSignInNavigation]);

  const handleClickLocalSetup = () => {
    setConfirmLocalSetupOpen(true);
  };

  const handleConfirmLocalSetup = () => {
    setConfirmLocalSetupOpen(false);
    setDidSignUpWithAccount(false);
    goToOnboardingPage("chooseTranscription");
  };

  const handleCancelLocalSetup = () => {
    setConfirmLocalSetupOpen(false);
  };

  const handleContinueWithGoogle = () => {
    setAwaitingSignInNavigation(true);
    submitSignInWithGoogle();
  };

  const handleOpenEmailDialog = () => {
    setAwaitingSignInNavigation(true);
    setEmailDialogOpen(true);
  };

  const handleCloseEmailDialog = () => {
    setAwaitingSignInNavigation(false);
    setEmailDialogOpen(false);
  };

  const handleContinue = () => {
    setDidSignUpWithAccount(true);
    goToOnboardingPage("userDetails");
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const rightContent = (
    <Box
      component="img"
      src="https://illustrations.popsy.co/amber/student-going-to-school.svg"
      alt="Illustration"
      sx={{ maxWidth: 400, maxHeight: 400 }}
    />
  );

  const signedInContent = (
    <OnboardingFormLayout
      actions={
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      }
    >
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={600} pb={1}>
          <FormattedMessage defaultMessage="Welcome back" />
        </Typography>

        <Typography variant="body1" color="text.secondary">
          <FormattedMessage
            defaultMessage="You are signed in as {email}"
            values={{ email: auth?.email }}
          />
        </Typography>

        <Link
          component="button"
          variant="body2"
          onClick={handleSignOut}
          sx={{ alignSelf: "flex-start" }}
        >
          <FormattedMessage defaultMessage="Sign out" />
        </Link>
      </Stack>
    </OnboardingFormLayout>
  );

  const signInContent = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Button
          onClick={handleClickLocalSetup}
          variant="text"
          endIcon={<ArrowForward />}
          sx={{ color: "text.disabled", fontWeight: 400 }}
        >
          <FormattedMessage defaultMessage="Local set up" />
        </Button>
      }
    >
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={600} pb={1}>
          <FormattedMessage defaultMessage="Create your account" />
        </Typography>

        <Button
          fullWidth
          variant="contained"
          startIcon={<Google />}
          onClick={handleContinueWithGoogle}
          disabled={loginStatus === "loading"}
        >
          <FormattedMessage defaultMessage="Continue with Google" />
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<Email />}
          onClick={handleOpenEmailDialog}
          disabled={loginStatus === "loading"}
        >
          <FormattedMessage defaultMessage="Sign up with email" />
        </Button>

        <TermsNotice align="left" />
      </Stack>

      <Dialog
        open={emailDialogOpen}
        onClose={handleCloseEmailDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent>
          <LoginForm hideGoogleButton hideModeSwitch defaultMode="signUp" />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmLocalSetupOpen}
        onCancel={handleCancelLocalSetup}
        onConfirm={handleConfirmLocalSetup}
        title={<FormattedMessage defaultMessage="⚠️ Advanced Setup Required" />}
        content={
          <FormattedMessage defaultMessage="Local set up is complicated and requires a strong technical background. We recommend the free plan for most users." />
        }
        confirmLabel={<FormattedMessage defaultMessage="Accept" />}
        cancelLabel={<FormattedMessage defaultMessage="Go back" />}
      />
    </OnboardingFormLayout>
  );

  const form = isSignedIn ? signedInContent : signInContent;

  return <DualPaneLayout left={form} right={rightContent} />;
};
