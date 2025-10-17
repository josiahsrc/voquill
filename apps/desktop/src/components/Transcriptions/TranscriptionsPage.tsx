import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Box, Divider, IconButton, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { TypographyWithMore } from "../Common/TypographyWithMore";
import { DashboardEntryLayout } from "../Dashboard/DashboardEntryLayout";

type Transcript = {
  id: string;
  createdAt: string;
  content: string;
};

const MOCK_TRANSCRIPTS: Transcript[] = [
  {
    id: "1",
    createdAt: "2024-11-02T17:42:00.000Z",
    content:
      "Hey team, thanks for joining the call today. I want to run through the updated roadmap for the release and make sure we align on testing coverage. First, the onboarding flow is still on track for the 15th, but we need more QA cycles on the localization efforts. Sarah, can you loop in the translation vendor this week so we can validate Spanish and French strings by Thursday?",
  },
  {
    id: "2",
    createdAt: "2024-10-30T09:18:00.000Z",
    content:
      "Welcome back to the Voquill AI writing workshop. Last session we covered tone adjustments across marketing copy. Today we'll dive into personalization tokens and how they can be safely integrated into outbound sequences. Remember, the goal is to feel custom without exposing private customer data. We'll look at real samples and iterate together.",
  },
  {
    id: "3",
    createdAt: "2024-10-25T14:05:00.000Z",
    content:
      "This is your daily standup summary. Yesterday: finished the analytics ingestion Lambda changes and deployed to staging. Blockers: the data warehouse sync job is still failing due to credential rotation. Plan for today: pair with infra to restore the secret and add alerts to catch this earlier next time.",
  },
  {
    id: "4",
    createdAt: "2024-10-20T15:35:00.000Z",
    content:
      "Thank you for calling Voquill support. We noticed your desktop app has been crashing on launch. Please try resetting your local workspace by removing the .voquill cache folder. If issues persist, email support@voquill.com with the log bundle created via Settings → Diagnostics.",
  },
  {
    id: "5",
    createdAt: "2024-10-12T11:22:00.000Z",
    content:
      "Internal note: customers continue to ask for better filtering by date range. Product is considering a virtualized timeline view to handle large volumes of transcripts. Next step is to validate with the design team and scope a beta for power users.",
  },
  {
    id: "6",
    createdAt: "2024-10-01T08:10:00.000Z",
    content:
      "Onboarding reminder: Welcome to Voquill! To get started, connect your calendar so the app can automatically surface meeting summaries. You'll receive a weekly digest every Friday at 4 PM local time summarizing action items and follow-up tasks.",
  },
  {
    id: "7",
    createdAt: "2024-09-18T21:55:00.000Z",
    content:
      'UX research interview snippet: "When I\'m reviewing transcripts, I want to quickly copy highlights into my CRM notes without opening each one individually." This feedback reinforces the need for quick actions on the list view.',
  },
  {
    id: "8",
    createdAt: "2024-09-05T07:35:00.000Z",
    content:
      "Engineering sync: migrating to Tauri v2 has reduced cold start time by 40%. Remaining work includes replacing the legacy notification bridge and validating auto-update flows on macOS arm64 devices.",
  },
  {
    id: "9",
    createdAt: "2024-08-27T13:47:00.000Z",
    content:
      "Marketing brainstorm: consider a series of blog posts highlighting customers that automate transcription clean-up. Potential angles include education, sales, and customer success personas.",
  },
  {
    id: "10",
    createdAt: "2024-08-12T16:02:00.000Z",
    content:
      "Sprint demo recap: We shipped the new transcript tagging feature with keyboard shortcuts. Early metrics show a 25% increase in saved searches. Next iteration includes saved filters synced across devices.",
  },
];

const TRANSCRIPT_DATE_FORMAT = "MMM D, YYYY";

export default function TranscriptionsPage() {
  const initialTranscripts = useMemo(() => [...MOCK_TRANSCRIPTS], []);
  const [transcripts, setTranscripts] =
    useState<Transcript[]>(initialTranscripts);

  const handleCopyTranscript = async (content: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(content);
      } catch (error) {
        console.warn("Unable to copy transcript", error);
      }
    }
  };

  const handleDeleteTranscript = (id: string) => {
    setTranscripts((current) =>
      current.filter((transcript) => transcript.id !== id)
    );
  };

  return (
    <DashboardEntryLayout>
      <Stack direction="column" spacing={2} sx={{ height: "100%" }}>
        <Typography variant="h4" fontWeight={700}>
          History
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Number of Transcripts: {transcripts.length}
        </Typography>
        <Box sx={{ flexGrow: 1, bgcolor: "red" }}>
          <Virtuoso
            data={transcripts}
            style={{ height: "100%" }}
            itemContent={(index, transcript) => (
              <Box sx={{ px: 2, py: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    {dayjs(transcript.createdAt).format(TRANSCRIPT_DATE_FORMAT)}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      aria-label="Copy transcript"
                      onClick={() => handleCopyTranscript(transcript.content)}
                      size="small"
                    >
                      <ContentCopyRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Delete transcript"
                      onClick={() => handleDeleteTranscript(transcript.id)}
                      size="small"
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <TypographyWithMore
                  variant="body2"
                  color="text.primary"
                  maxLines={3}
                  sx={{ mt: 1 }}
                >
                  {transcript.content}
                </TypographyWithMore>
                {index < transcripts.length - 1 ? (
                  <Divider sx={{ mt: 2 }} />
                ) : null}
              </Box>
            )}
          />
        </Box>
      </Stack>
    </DashboardEntryLayout>
  );
}
