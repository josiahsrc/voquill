import { ArrowForward } from "@mui/icons-material";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { produceAppState, useAppStore } from "../../store";
import { trackButtonClick } from "../../utils/analytics.utils";
import { isMacOS } from "../../utils/env.utils";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const UserDetailsForm = () => {
  const intl = useIntl();
  const name = useAppStore((state) => state.onboarding.name);
  const title = useAppStore((state) => state.onboarding.title);
  const company = useAppStore((state) => state.onboarding.company);
  const submitting = useAppStore((state) => state.onboarding.submitting);
  const isEnterprise = useAppStore((state) => state.isEnterprise);

  const canContinue = name && !submitting;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.name = e.target.value;
    });
  };

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.name = e.target.value.trim();
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.title = e.target.value;
    });
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.title = e.target.value.trim();
    });
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.company = e.target.value;
    });
  };

  const handleCompanyBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    produceAppState((draft) => {
      draft.onboarding.company = e.target.value.trim();
    });
  };

  const handleContinue = () => {
    trackButtonClick("onboarding_user_details_continue");
    if (isEnterprise) {
      goToOnboardingPage(isMacOS() ? "micPerms" : "keybindings");
    } else {
      goToOnboardingPage("referralSource");
    }
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleContinue}
          disabled={!canContinue}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} pb={1}>
            <FormattedMessage defaultMessage="Tell us about yourself" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="This information helps personalize your experience." />
          </Typography>
        </Box>

        <Stack spacing={2}>
          <TextField
            variant="outlined"
            size="small"
            label={<FormattedMessage defaultMessage="Full name" />}
            placeholder={intl.formatMessage({ defaultMessage: "John Doe" })}
            value={name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            autoFocus
            autoComplete="name"
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                "data-voquill-ignore": "true",
              },
            }}
          />

          {!isEnterprise && (
            <>
              <TextField
                variant="outlined"
                size="small"
                label={<FormattedMessage defaultMessage="Title" />}
                placeholder={intl.formatMessage({
                  defaultMessage: "Vice President",
                })}
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                autoComplete="organization-title"
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    "data-voquill-ignore": "true",
                  },
                }}
              />

              <TextField
                variant="outlined"
                size="small"
                label={<FormattedMessage defaultMessage="Company" />}
                placeholder={intl.formatMessage({
                  defaultMessage: "Acme Inc.",
                })}
                value={company}
                onChange={handleCompanyChange}
                onBlur={handleCompanyBlur}
                autoComplete="organization"
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    "data-voquill-ignore": "true",
                  },
                }}
              />
            </>
          )}
        </Stack>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box
      component="img"
      src="https://illustrations.popsy.co/amber/man-riding-a-rocket.svg"
      alt="Illustration"
      sx={{ maxWidth: 400, maxHeight: 400 }}
    />
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
