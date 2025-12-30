import { Box, Stack, TextField, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import {
  calculateTimeSavedMinutes,
  formatMoneySaved,
  formatTimeSaved,
} from "../../utils/stats.utils";
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

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const preferences = useAppStore(getMyUserPreferences);
  const userName = useAppStore(getMyUserName);
  const intl = useIntl();

  const wordsTotal = user?.wordsTotal ?? 0;
  const hourlyRate = preferences?.hourlyRate ?? null;

  // Localized time labels
  const timeLabels = {
    lessThanOneMin: intl.formatMessage({ defaultMessage: "< 1 min" }),
    minLabel: intl.formatMessage({ defaultMessage: "min" }),
    hrLabel: intl.formatMessage({ defaultMessage: "hr" }),
  };

  // Calculate time saved
  const timeSavedMinutes = calculateTimeSavedMinutes(wordsTotal);
  const timeSavedDisplay = formatTimeSaved(timeSavedMinutes, timeLabels);

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
