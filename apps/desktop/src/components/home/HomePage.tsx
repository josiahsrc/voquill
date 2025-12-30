import { Box, Stack, TextField, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import {
  getMyUser,
  getMyUserName,
  getMyUserPreferences,
} from "../../utils/user.utils";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { Stat } from "./Stat";
import { HomeSideEffects } from "./HomeSideEffects";
import { DictationInstruction } from "../common/DictationInstruction";

// Average words per minute for typing vs speaking
const TYPING_WPM = 40;
const SPEAKING_WPM = 150;

// Calculate time saved in minutes based on word count
// Time saved = time to type - time to speak
const calculateTimeSavedMinutes = (wordCount: number): number => {
  const typingMinutes = wordCount / TYPING_WPM;
  const speakingMinutes = wordCount / SPEAKING_WPM;
  return typingMinutes - speakingMinutes;
};

// Format time saved for display
const formatTimeSaved = (minutes: number): string => {
  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
};

// Format money saved for display
const formatMoneySaved = (
  amount: number,
  locale: string,
  currency: string = "USD",
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const preferences = useAppStore(getMyUserPreferences);
  const userName = useAppStore(getMyUserName);
  const intl = useIntl();

  const wordsTotal = user?.wordsTotal ?? 0;
  const hourlyRate = preferences?.hourlyRate ?? null;

  // Calculate time saved
  const timeSavedMinutes = calculateTimeSavedMinutes(wordsTotal);
  const timeSavedDisplay = formatTimeSaved(timeSavedMinutes);

  // Calculate money saved (only if hourly rate is set)
  const timeSavedHours = timeSavedMinutes / 60;
  const moneySaved = hourlyRate ? timeSavedHours * hourlyRate : null;
  const moneySavedDisplay =
    moneySaved !== null ? formatMoneySaved(moneySaved, intl.locale) : null;

  return (
    <DashboardEntryLayout>
      <HomeSideEffects />
      <Stack direction="column">
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          <FormattedMessage
            defaultMessage="Welcome, {name}"
            values={{ name: userName }}
          />
        </Typography>
        <Box sx={{ my: 8 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mb: 2 }}
            justifyContent="space-around"
          >
            <Stat
              label={intl.formatMessage({
                defaultMessage: "Time saved",
              })}
              value={timeSavedDisplay}
              subtitle={
                moneySavedDisplay
                  ? intl.formatMessage(
                      {
                        defaultMessage: "{amount} saved",
                      },
                      { amount: moneySavedDisplay },
                    )
                  : undefined
              }
            />
            <Stat
              label={intl.formatMessage({
                defaultMessage: "Words total",
              })}
              value={wordsTotal}
            />
          </Stack>
        </Box>
        <Section
          title={intl.formatMessage({
            defaultMessage: "Try it out",
          })}
          description={intl.formatMessage({
            defaultMessage:
              "Use this space to type or paste anything and see how Voquill handles it. Nothing you write here is saved.",
          })}
        >
          <Box sx={{ mb: 2 }}>
            <DictationInstruction />
          </Box>
          <TextField
            variant="outlined"
            fullWidth
            multiline
            minRows={5}
            placeholder={intl.formatMessage({
              defaultMessage: "Start dictating here...",
            })}
            autoComplete="off"
          />
        </Section>
      </Stack>
    </DashboardEntryLayout>
  );
}
