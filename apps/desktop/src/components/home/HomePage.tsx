import { LocalFireDepartmentRounded } from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import { getEffectiveStreak, getMyUser, getMyUserName } from "../../utils/user.utils";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
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

function TranscriptionPreview({
  text,
  time,
  app,
}: {
  text: string;
  time: string;
  app: string;
}) {
  return (
    <Card>
      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 0.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            {app}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {time}
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {text}
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

  const wordsThisMonth = user?.wordsThisMonth ?? 0;
  const wordsTotal = user?.wordsTotal ?? 0;

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
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Here's how your voice is doing." />
          </Typography>
        </Box>

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

        <GettingStartedList />

        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
            <FormattedMessage defaultMessage="Recent transcriptions" />
          </Typography>
          <Stack spacing={1}>
            <TranscriptionPreview
              text="Hey, I wanted to follow up on the project timeline we discussed yesterday. Can we move the deadline to next Friday?"
              time="2 min ago"
              app="Slack"
            />
            <TranscriptionPreview
              text="The quarterly report shows a 15% increase in user engagement across all platforms, which is above our target."
              time="1 hour ago"
              app="Google Docs"
            />
            <TranscriptionPreview
              text="Please schedule a meeting with the design team for Thursday at 3pm to review the new mockups."
              time="Yesterday"
              app="Gmail"
            />
          </Stack>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
            <Chip
              label={<FormattedMessage defaultMessage="View all" />}
              variant="outlined"
              clickable
              sx={{ border: "none" }}
            />
          </Box>
        </Box>
      </Stack>
    </DashboardEntryLayout>
  );
}
