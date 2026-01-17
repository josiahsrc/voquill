import { AccessibilityNew, ArrowForward } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const A11yPermsForm = () => {
  const handleEnable = () => {
    // TODO: Request accessibility permissions
  };

  const handleContinue = () => {
    goToOnboardingPage("keybindings");
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
            <FormattedMessage defaultMessage="Enable accessibility" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Voquill needs accessibility permissions to paste transcriptions into focused text fields." />
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<AccessibilityNew />}
          onClick={handleEnable}
          sx={{ alignSelf: "flex-start" }}
        >
          <FormattedMessage defaultMessage="Enable accessibility" />
        </Button>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box
      sx={{
        borderRadius: "12px",
        border: "1px solid gray",
        overflow: "hidden",
        maxHeight: "100%",
      }}
    >
      <Box
        component="video"
        src="/src/assets/enable-a11y.mp4"
        autoPlay
        loop
        muted
        playsInline
        sx={{
          display: "block",
          margin: "-2px",
          width: "auto",
          height: "auto",
          maxWidth: "calc(100% + 4px)",
          maxHeight: "calc(100% + 4px)",
        }}
      />
    </Box>
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
