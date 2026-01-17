import { ArrowForward, Mic } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const MicPermsForm = () => {
  const handleEnable = () => {
    // TODO: Request microphone permissions
  };

  const handleContinue = () => {
    goToOnboardingPage("a11yPerms");
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
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
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} pb={1}>
            <FormattedMessage defaultMessage="Set up your microphone" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Voquill only activates your microphone when you choose to start recording." />
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Mic />}
          onClick={handleEnable}
          sx={{ alignSelf: "flex-start" }}
        >
          <FormattedMessage defaultMessage="Enable microphone" />
        </Button>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box
      sx={{
        borderRadius: "24px",
        border: "1px solid gray",
        overflow: "hidden",
        maxHeight: "100%",
        margin: 8,
      }}
    >
      <Box
        component="video"
        src="/src/assets/enable-mic.mp4"
        autoPlay
        loop
        muted
        playsInline
        sx={{
          display: "block",
          margin: "-10px",
          width: "auto",
          height: "auto",
          maxWidth: "calc(100% + 20px)",
          maxHeight: "calc(100% + 20px)",
        }}
      />
    </Box>
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
