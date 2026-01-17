import {
  AllInclusive,
  ArrowForward,
  AutoAwesome,
  Devices,
  Mic,
} from "@mui/icons-material";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { Logo } from "../common/Logo";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const UnlockedProForm = () => {
  const handleContinue = () => {
    goToOnboardingPage("tutorial");
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Button
          variant="contained"
          onClick={handleContinue}
          endIcon={<ArrowForward />}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Chip
            label={<FormattedMessage defaultMessage="FREE TRIAL" />}
            sx={{
              mb: 2,
              fontWeight: 600,
              bgcolor: "level1",
              color: "text.secondary",
            }}
          />
          <Typography variant="h4" fontWeight={600} pb={1}>
            <FormattedMessage defaultMessage="Pro mode unlocked 🙌" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="One week on us. No payment info required." />
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AllInclusive sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="No word limits" />
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Devices sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="Cross-device syncing" />
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Mic sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="AI dictation" />
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AutoAwesome sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="Agent mode" />
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Logo width="4rem" height="4rem" />
      <Typography variant="h3" fontWeight={700}>
        Voquill
      </Typography>
      <Chip
        label="Pro"
        sx={{
          bgcolor: "primary.main",
          color: "primary.contrastText",
          fontWeight: 700,
          fontSize: "1.25rem",
          height: 40,
          borderRadius: 1.5,
          "& .MuiChip-label": {
            px: 2,
          },
        }}
      />
    </Stack>
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
