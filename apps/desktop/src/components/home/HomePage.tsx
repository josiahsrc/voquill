import { Box, Stack, TextField, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import {
  calculateEstimatedTypingMinutes,
  formatTime,
} from "../../utils/stats.utils";
import { getMyUser, getMyUserName } from "../../utils/user.utils";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { Stat } from "./Stat";
import { HomeSideEffects } from "./HomeSideEffects";
import { DictationInstruction } from "../common/DictationInstruction";

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const userName = useAppStore(getMyUserName);
  const intl = useIntl();

  const wordsTotal = user?.wordsTotal ?? 0;
  const durationTotalMs = user?.durationTotalMs ?? 0;

  // Localized time labels
  const timeLabels = {
    lessThanOneMin: intl.formatMessage({ defaultMessage: "< 1 min" }),
    minLabel: intl.formatMessage({ defaultMessage: "min" }),
    hrLabel: intl.formatMessage({ defaultMessage: "hr" }),
  };

  // Calculate times
  const transcriptionMinutes = durationTotalMs / 60000;
  const estimatedTypingMinutes = calculateEstimatedTypingMinutes(wordsTotal);

  const transcriptionTimeDisplay = formatTime(transcriptionMinutes, timeLabels);
  const estimatedTypingTimeDisplay = formatTime(
    estimatedTypingMinutes,
    timeLabels,
  );

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
                defaultMessage: "Time to transcribe",
              })}
              value={transcriptionTimeDisplay}
            />
            <Stat
              label={intl.formatMessage({
                defaultMessage: "Estimated typing time",
              })}
              value={estimatedTypingTimeDisplay}
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
