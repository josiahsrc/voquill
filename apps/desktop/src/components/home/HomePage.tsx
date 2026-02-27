import { LocalFireDepartmentRounded } from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import {
  getDictationSpeed,
  getEffectiveStreak,
  getMyUser,
  getMyUserName,
} from "../../utils/user.utils";
import { DictationInstruction } from "../common/DictationInstruction";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { TranscriptionRow } from "../transcriptions/TranscriptRow";
import { GettingStartedList } from "./GettingStartedList";
import { HomeSideEffects } from "./HomeSideEffects";

function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent sx={{ py: 2, px: 2.5, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          {icon}
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const userName = useAppStore(getMyUserName);
  const streak = useAppStore(getEffectiveStreak);
  const intl = useIntl();

  const dictationSpeed = useAppStore(getDictationSpeed);
  const wordsThisMonth = user?.wordsThisMonth ?? 0;
  const wordsTotal = user?.wordsTotal ?? 0;
  const navigate = useNavigate();

  const recentIds = useAppStore(
    (state) => state.transcriptions.transcriptionIds,
  );
  const topIds = useMemo(() => recentIds.slice(0, 2), [recentIds]);

  return (
    <DashboardEntryLayout>
      <HomeSideEffects />
      <Stack direction="column" spacing={4}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
            <FormattedMessage
              defaultMessage="Welcome back, {name}"
              values={{ name: userName }}
            />
          </Typography>
          <DictationInstruction />
        </Box>

        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5}>
            <StatCard
              value={streak.toString()}
              label={intl.formatMessage({ defaultMessage: "Day streak" })}
              icon={
                <LocalFireDepartmentRounded
                  sx={{ color: "#FF6B35", fontSize: 24 }}
                />
              }
            />
            <StatCard
              value={wordsThisMonth.toLocaleString()}
              label={intl.formatMessage({ defaultMessage: "Words this month" })}
            />
            <StatCard
              value={wordsTotal.toLocaleString()}
              label={intl.formatMessage({ defaultMessage: "Words total" })}
            />
          </Stack>

          {dictationSpeed != null && (
            <Tooltip
              title={intl.formatMessage(
                {
                  defaultMessage:
                    "Average words per minute across your last {count, plural, one {# dictation} other {# dictations}}. Compared against a median typing speed of 40 WPM.",
                },
                { count: dictationSpeed.sampleCount },
              )}
              arrow
              placement="bottom"
            >
              <Card sx={{ cursor: "default" }}>
                <CardContent sx={{ py: 2, px: 2.5, "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" alignItems="baseline" spacing={1.5}>
                    <Typography variant="h5" fontWeight={700}>
                      <FormattedMessage
                        defaultMessage="{wpm} WPM"
                        values={{ wpm: dictationSpeed.wpm }}
                      />
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <FormattedMessage
                        defaultMessage="{multiplier}x faster than typing"
                        values={{
                          multiplier: (dictationSpeed.wpm / 40).toFixed(1),
                        }}
                      />
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Tooltip>
          )}
        </Stack>

        <GettingStartedList />

        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            <FormattedMessage defaultMessage="Recent transcriptions" />
          </Typography>
          {topIds.length > 0 ? (
            <>
              {topIds.map((id) => (
                <TranscriptionRow key={id} id={id} />
              ))}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
                <Chip
                  label={<FormattedMessage defaultMessage="View all" />}
                  variant="outlined"
                  clickable
                  onClick={() => navigate("/dashboard/transcriptions")}
                  sx={{ border: "none" }}
                />
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <FormattedMessage defaultMessage="No transcriptions yet." />
            </Typography>
          )}
        </Box>
      </Stack>
    </DashboardEntryLayout>
  );
}
