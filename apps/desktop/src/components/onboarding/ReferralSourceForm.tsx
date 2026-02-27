import {
  ArrowForward,
  Article,
  AutoAwesomeOutlined,
  Code,
  MoreHoriz,
  People,
  PlayCircle,
  Reddit,
  RocketLaunch,
  Search,
  Share,
} from "@mui/icons-material";
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { produceAppState } from "../../store";
import { trackButtonClick } from "../../utils/analytics.utils";
import { isMacOS } from "../../utils/env.utils";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

const REFERRAL_OPTIONS = [
  {
    label: "AI Chat",
    value: "ai_chat",
    icon: <AutoAwesomeOutlined fontSize="small" />,
  },
  { label: "YouTube", value: "youtube", icon: <PlayCircle fontSize="small" /> },
  { label: "Friend", value: "friend", icon: <People fontSize="small" /> },
  {
    label: "Product Hunt",
    value: "product_hunt",
    icon: <RocketLaunch fontSize="small" />,
  },
  { label: "GitHub", value: "github", icon: <Code fontSize="small" /> },
  {
    label: "Google Search",
    value: "google_search",
    icon: <Search fontSize="small" />,
  },
  { label: "Reddit", value: "reddit", icon: <Reddit fontSize="small" /> },
  {
    label: "Social Media",
    value: "social_media",
    icon: <Share fontSize="small" />,
  },
  { label: "Blog", value: "blog", icon: <Article fontSize="small" /> },
  { label: "Other", value: "other", icon: <MoreHoriz fontSize="small" /> },
] as const;

export const ReferralSourceForm = () => {
  const intl = useIntl();
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");

  const handleChipClick = (value: string) => {
    setSelected(value);

    if (value !== "other") {
      produceAppState((draft) => {
        draft.onboarding.referralSource = value;
      });
      navigateForward();
    }
  };

  const navigateForward = () => {
    trackButtonClick("onboarding_referral_source_continue");
    goToOnboardingPage(isMacOS() ? "micPerms" : "keybindings");
  };

  const handleOtherContinue = () => {
    const trimmed = otherText.trim();
    if (!trimmed) return;
    produceAppState((draft) => {
      draft.onboarding.referralSource = `other: ${trimmed}`;
    });
    navigateForward();
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        selected === "other" ? (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleOtherContinue}
            disabled={!otherText.trim()}
          >
            <FormattedMessage defaultMessage="Continue" />
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={3} pb={4}>
        <Box>
          <Typography variant="h4" fontWeight={600} pb={1}>
            <FormattedMessage defaultMessage="How did you hear about us?" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="This is a huge help to us as we work to improve Voquill for everyone." />
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {REFERRAL_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              icon={option.icon}
              label={option.label}
              variant={selected === option.value ? "filled" : "outlined"}
              color={selected === option.value ? "primary" : "default"}
              onClick={() => handleChipClick(option.value)}
            />
          ))}
        </Box>

        {selected === "other" && (
          <TextField
            variant="outlined"
            size="small"
            label={<FormattedMessage defaultMessage="Please specify" />}
            placeholder={intl.formatMessage({
              defaultMessage: "e.g. Podcast, conference, etc.",
            })}
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            autoFocus
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { "data-voquill-ignore": "true" },
            }}
          />
        )}
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box
      component="img"
      src="https://illustrations.popsy.co/amber/communication.svg"
      alt="Illustration"
      sx={{ maxWidth: 400, maxHeight: 400 }}
    />
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
