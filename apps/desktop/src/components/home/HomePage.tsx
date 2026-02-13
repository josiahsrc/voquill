import {
  CheckCircleRounded,
  LocalFireDepartmentRounded,
  RadioButtonUncheckedRounded,
} from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import { getMyUser, getMyUserName } from "../../utils/user.utils";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { HomeSideEffects } from "./HomeSideEffects";

type ChecklistItem = {
  label: string;
  done: boolean;
};

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

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        py: 1.25,
        px: 0.5,
        borderRadius: 1,
        "&:hover": { bgcolor: "var(--app-palette-level1)" },
        transition: "background-color 0.15s",
      }}
    >
      {item.done ? (
        <CheckCircleRounded
          sx={{ color: "var(--app-palette-blue)", fontSize: 22 }}
        />
      ) : (
        <RadioButtonUncheckedRounded
          sx={{ color: "text.disabled", fontSize: 22 }}
        />
      )}
      <Typography
        variant="body1"
        sx={{
          textDecoration: item.done ? "line-through" : "none",
          color: item.done ? "text.secondary" : "text.primary",
        }}
      >
        {item.label}
      </Typography>
    </Stack>
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
  const intl = useIntl();

  const wordsThisMonth = user?.wordsThisMonth ?? 0;
  const wordsTotal = user?.wordsTotal ?? 0;

  const checklist: ChecklistItem[] = [
    {
      label: intl.formatMessage({
        defaultMessage: "Record your first transcription",
      }),
      done: true,
    },
    {
      label: intl.formatMessage({
        defaultMessage: "Use Voquill in 3 different apps (1 of 3)",
      }),
      done: false,
    },
    {
      label: intl.formatMessage({
        defaultMessage: "Customize a writing style",
      }),
      done: false,
    },
    {
      label: intl.formatMessage({
        defaultMessage: "Add a word to your dictionary",
      }),
      done: true,
    },
  ];

  const completedCount = checklist.filter((i) => i.done).length;
  const progress = (completedCount / checklist.length) * 100;

  return (
    <DashboardEntryLayout>
      <HomeSideEffects />
      <Stack direction="column" spacing={3}>
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
            value="4"
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

        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6" fontWeight={600}>
              <FormattedMessage defaultMessage="Getting started" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage
                defaultMessage="{completed} of {total}"
                values={{ completed: completedCount, total: checklist.length }}
              />
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "var(--app-palette-level2)",
              mb: 1,
              "& .MuiLinearProgress-bar": {
                bgcolor: "var(--app-palette-blue)",
                borderRadius: 3,
              },
            }}
          />
          <Stack spacing={0}>
            {checklist.map((item) => (
              <ChecklistRow key={item.label} item={item} />
            ))}
          </Stack>
        </Box>

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
