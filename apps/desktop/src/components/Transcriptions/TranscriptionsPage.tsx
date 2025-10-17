import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Box,
  Container,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { TypographyWithMore } from "../Common/TypographyWithMore";
import { lerp } from "@repo/utilities";

type Transcript = {
  id: string;
  createdAt: string;
  content: string;
};

const MOCK_TRANSCRIPTS: Transcript[] = Array.from({ length: 4000 }, (_, i) => {
  const baseTranscripts = [
    {
      content:
        "Hey team, thanks for joining the call today. I want to run through the updated roadmap for the release and make sure we align on testing coverage. First, the onboarding flow is still on track for the 15th, but we need more QA cycles on the localization efforts. Sarah, can you loop in the translation vendor this week so we can validate Spanish and French strings by Thursday?",
    },
    {
      content:
        "Welcome back to the Voquill AI writing workshop. Last session we covered tone adjustments across marketing copy. Today we'll dive into personalization tokens and how they can be safely integrated into outbound sequences. Remember, the goal is to feel custom without exposing private customer data. We'll look at real samples and iterate together.",
    },
    {
      content:
        "This is your daily standup summary. Yesterday: finished the analytics ingestion Lambda changes and deployed to staging. Blockers: the data warehouse sync job is still failing due to credential rotation. Plan for today: pair with infra to restore the secret and add alerts to catch this earlier next time.",
    },
    {
      content:
        "Thank you for calling Voquill support. We noticed your desktop app has been crashing on launch. Please try resetting your local workspace by removing the .voquill cache folder. If issues persist, email support@voquill.com with the log bundle created via Settings → Diagnostics.",
    },
    {
      content:
        "Internal note: customers continue to ask for better filtering by date range. Product is considering a virtualized timeline view to handle large volumes of transcripts. Next step is to validate with the design team and scope a beta for power users.",
    },
    {
      content:
        "Onboarding reminder: Welcome to Voquill! To get started, connect your calendar so the app can automatically surface meeting summaries. You'll receive a weekly digest every Friday at 4 PM local time summarizing action items and follow-up tasks.",
    },
    {
      content:
        'UX research interview snippet: "When I\'m reviewing transcripts, I want to quickly copy highlights into my CRM notes without opening each one individually." This feedback reinforces the need for quick actions on the list view.',
    },
    {
      content:
        "Engineering sync: migrating to Tauri v2 has reduced cold start time by 40%. Remaining work includes replacing the legacy notification bridge and validating auto-update flows on macOS arm64 devices.",
    },
    {
      content:
        "Marketing brainstorm: consider a series of blog posts highlighting customers that automate transcription clean-up. Potential angles include education, sales, and customer success personas.",
    },
    {
      content:
        "Sprint demo recap: We shipped the new transcript tagging feature with keyboard shortcuts. Early metrics show a 25% increase in saved searches. Next iteration includes saved filters synced across devices.",
    },
  ];

  const baseIndex = i % baseTranscripts.length;
  const daysAgo = Math.floor(i / 2);

  return {
    id: String(i + 1),
    createdAt: dayjs().subtract(daysAgo, "day").toISOString(),
    content: baseTranscripts[baseIndex].content,
  };
});

const TRANSCRIPT_DATE_FORMAT = "MMM D, YYYY";

export default function TranscriptionsPage() {
  const initialTranscripts = useMemo(() => [...MOCK_TRANSCRIPTS], []);
  const [transcripts, setTranscripts] =
    useState<Transcript[]>(initialTranscripts);
  const [scrollerNode, setScrollerNode] = useState<HTMLElement | Window | null>(
    null
  );
  const [collapseProgress, setCollapseProgress] = useState(0);

  useEffect(() => {
    if (!scrollerNode || scrollerNode instanceof Window) {
      return;
    }

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        const progress = Math.min(scrollerNode.scrollTop / 96, 1);
        setCollapseProgress(progress);
        rafId = null;
      });
    };

    handleScroll();
    scrollerNode.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollerNode.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [scrollerNode]);

  const handleScrollerRef = useCallback((node: HTMLElement | Window | null) => {
    setScrollerNode(node);
  }, []);

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

  const headerPaddingTop = 1 - collapseProgress;
  const headerPaddingBottom = 2 + (1 - collapseProgress) * 3;
  const headerGap = 1 + (1 - collapseProgress);
  const titleFontSizePx = 34 - (34 - 22) * collapseProgress;
  const subtitleOpacity = Math.min(lerp(0, 1, 1 - collapseProgress * 2), 1);

  // Calculate the height that the header shrinks by
  // This will be used to offset the content so it doesn't scroll until header is collapsed
  const headerShrinkAmount = 96 * (1 - collapseProgress);

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={(theme) => ({
          pr: 2,
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.appBar,
        })}
      >
        <Container
          maxWidth="sm"
          sx={{
            pt: headerPaddingTop,
            pb: headerPaddingBottom,
            position: "relative",
          }}
        >
          <Stack spacing={headerGap}>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={(theme) => ({
                fontSize: theme.typography.pxToRem(titleFontSizePx),
                lineHeight: theme.typography.pxToRem(titleFontSizePx * 1.15),
              })}
            >
              History
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{
                opacity: subtitleOpacity,
                position: "absolute",
                bottom: 0,
                transform: `translateY(${subtitleOpacity * 4}px)`,
              }}
            >
              Number of Transcripts: {transcripts.length}
            </Typography>
          </Stack>
        </Container>
      </Box>
      <Virtuoso
        data={transcripts}
        scrollerRef={handleScrollerRef}
        style={{ flex: 1 }}
        components={{
          Header: () => <Box sx={{ height: headerShrinkAmount / 2 }} />,
        }}
        itemContent={(index, transcript) => (
          <Container maxWidth="sm">
            <Box sx={{ py: 2 }}>
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
          </Container>
        )}
      />
    </Box>
  );
}
