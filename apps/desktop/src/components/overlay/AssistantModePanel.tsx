import CloseIcon from "@mui/icons-material/Close";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import { Box, IconButton, Typography } from "@mui/material";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import type { ChatMessage } from "@repo/types";
import { emitTo } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { FormattedMessage } from "react-intl";
import type { OverlayPhase } from "../../types/overlay.types";

export const ASSISTANT_PANEL_OVERLAY_WIDTH = 600;
export const ASSISTANT_PANEL_OVERLAY_HEIGHT = 272;
const ASSISTANT_PANEL_COMPACT_WIDTH = 424;
const ASSISTANT_PANEL_COMPACT_HEIGHT = 120;
const ASSISTANT_PANEL_EXPANDED_WIDTH = 572;
const ASSISTANT_PANEL_EXPANDED_HEIGHT = 258;
const ASSISTANT_PANEL_HORIZONTAL_INSET = 14;
const ASSISTANT_PANEL_TOP_INSET = 14;
const ASSISTANT_PANEL_BOTTOM_INSET = 0;
const ASSISTANT_PANEL_RADIUS = 34;
const ASSISTANT_PANEL_CONTENT_TOP_INSET = 18;
const ASSISTANT_PANEL_CONTENT_SIDE_INSET = 24;
const ASSISTANT_PANEL_CONTENT_BOTTOM_INSET = 24;
const ASSISTANT_PANEL_HEADER_HEIGHT = 24;
const ASSISTANT_PANEL_HEADER_OFFSET_TOP = 18;
const ASSISTANT_PANEL_HEADER_OFFSET_RIGHT = 24;
const ASSISTANT_PANEL_TRANSCRIPT_TOP_OFFSET = 56;
const PANEL_SURFACE_TRANSITION =
  "opacity 220ms ease-out, transform 340ms cubic-bezier(0.22, 1, 0.36, 1), width 340ms cubic-bezier(0.22, 1, 0.36, 1), height 340ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 340ms cubic-bezier(0.22, 1, 0.36, 1)";

type AssistantModePanelProps = {
  phase: OverlayPhase;
  messages: ChatMessage[];
  open: boolean;
};

const USER_PROMPT_MAX_WIDTH = "66%";
const USER_PROMPT_HEAD_WORDS = 4;
const USER_PROMPT_TAIL_WORDS = 5;

type UserPromptPreview = {
  head: string;
  tail: string | null;
};

const thinkingShimmer = keyframes`
  0% {
    background-position: 200% 50%;
  }
  100% {
    background-position: -200% 50%;
  }
`;

const textFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(0.2em);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const getLatestMessageByRole = (
  messages: ChatMessage[],
  role: ChatMessage["role"],
) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === role) {
      return message;
    }
  }

  return null;
};

const formatUserPromptPreview = (text: string): UserPromptPreview | null => {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const words = normalized.split(" ");
  if (words.length <= USER_PROMPT_HEAD_WORDS + USER_PROMPT_TAIL_WORDS) {
    return {
      head: normalized,
      tail: null,
    };
  }

  return {
    head: words.slice(0, USER_PROMPT_HEAD_WORDS).join(" "),
    tail: words.slice(-USER_PROMPT_TAIL_WORDS).join(" "),
  };
};

const AnimatedText = ({
  text,
  color,
}: {
  text: string;
  color: string;
}) => {
  const segments = text.split(/(\s+)/);

  return (
    <Typography
      component="div"
      sx={{
        color,
        fontSize: 14,
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {segments.map((segment, index) =>
        /\s+/.test(segment) ? (
          <Box component="span" key={`space-${index}`}>
            {segment}
          </Box>
        ) : (
          <Box
            component="span"
            key={`word-${index}-${segment}`}
            sx={{
              display: "inline-block",
              opacity: 0,
              animation: `${textFadeIn} 380ms ease-out forwards`,
              animationDelay: `${Math.min(index, 18) * 26}ms`,
            }}
          >
            {segment}
          </Box>
        ),
      )}
    </Typography>
  );
};

type TranscriptEntryProps = {
  message: ChatMessage;
};

const TranscriptEntry = ({ message }: TranscriptEntryProps) => {
  const theme = useTheme();
  const isThinking = !message.content;
  const isError = message.role === "system";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      {isThinking ? (
        <Typography
          sx={{
            width: "fit-content",
            fontSize: 14,
            lineHeight: 1.45,
            fontWeight: 500,
            color: "transparent",
            backgroundImage: `linear-gradient(90deg, ${alpha(
              theme.palette.common.white,
              0.34,
            )} 0%, ${alpha(theme.palette.common.white, 0.92)} 50%, ${alpha(
              theme.palette.common.white,
              0.34,
            )} 100%)`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            animation: `${thinkingShimmer} 1.6s linear infinite`,
          }}
        >
          <FormattedMessage defaultMessage="Thinking" />
        </Typography>
      ) : null}

      {message.content ? (
        <AnimatedText
          text={message.content}
          color={
            isError
              ? alpha(theme.palette.error.light, 0.94)
              : alpha(theme.palette.common.white, 0.92)
          }
        />
      ) : null}
    </Box>
  );
};

export const AssistantModePanel = ({
  phase,
  messages,
  open,
}: AssistantModePanelProps) => {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const latestAssistantMessageRef = useRef<HTMLDivElement | null>(null);
  const latestUserMessage = getLatestMessageByRole(messages, "user");
  const userPromptPreview = latestUserMessage?.content
    ? formatUserPromptPreview(latestUserMessage.content)
    : null;
  const userPromptColor = alpha(theme.palette.common.white, 0.5);
  const assistantMessages = messages.filter(
    (message) => message.role === "assistant" || message.role === "system",
  );
  const isCompact = messages.length === 0;
  const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];
  const latestAssistantAutoScrollKey = latestAssistantMessage
    ? `${assistantMessages.length}:${latestAssistantMessage.content}`
    : "none";

  useEffect(() => {
    if (!open) {
      return;
    }

    const container = scrollContainerRef.current;
    const latestMessage = latestAssistantMessageRef.current;
    if (!container || !latestMessage) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTop = Math.max(0, latestMessage.offsetTop);
    });
  }, [latestAssistantAutoScrollKey, open]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: `${ASSISTANT_PANEL_TOP_INSET}px ${ASSISTANT_PANEL_HORIZONTAL_INSET}px ${ASSISTANT_PANEL_BOTTOM_INSET}px`,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: isCompact
            ? `${ASSISTANT_PANEL_COMPACT_WIDTH}px`
            : `${ASSISTANT_PANEL_EXPANDED_WIDTH}px`,
          height: isCompact
            ? `${ASSISTANT_PANEL_COMPACT_HEIGHT}px`
            : `${ASSISTANT_PANEL_EXPANDED_HEIGHT}px`,
          borderRadius: `${ASSISTANT_PANEL_RADIUS}px`,
          backgroundColor: alpha(theme.palette.common.black, 0.96),
          border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
          backdropFilter: "blur(22px)",
          overflow: "hidden",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(12px) scale(0.96)",
          transformOrigin: "bottom center",
          transition: PANEL_SURFACE_TRANSITION,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <IconButton
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            emitTo("main", "assistant-mode-close", {}).catch(console.error);
          }}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            width: 28,
            height: 28,
            color: alpha(theme.palette.common.white, 0.82),
            backgroundColor: alpha(theme.palette.common.white, 0.06),
            zIndex: 3,
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(6px)",
            transition:
              "opacity 140ms ease-out 80ms, transform 220ms cubic-bezier(0.22, 1, 0.36, 1) 80ms",
            "&:hover": {
              backgroundColor: alpha(theme.palette.common.white, 0.12),
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <Box
          sx={{
            position: "relative",
            height: "100%",
            padding: `${ASSISTANT_PANEL_CONTENT_TOP_INSET}px ${ASSISTANT_PANEL_CONTENT_SIDE_INSET}px ${ASSISTANT_PANEL_CONTENT_BOTTOM_INSET}px`,
          }}
        >
          {isCompact ? (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: theme.spacing(3.25),
                px: theme.spacing(8),
              }}
            >
              <Typography
                sx={{
                  color:
                    phase === "recording"
                      ? alpha(theme.palette.common.white, 0.96)
                      : alpha(theme.palette.common.white, 0.8),
                  fontSize: 18,
                  lineHeight: 1.2,
                  fontWeight: 500,
                  textAlign: "center",
                  letterSpacing: "-0.01em",
                }}
              >
                <FormattedMessage defaultMessage="What can I help you with?" />
              </Typography>
            </Box>
          ) : null}

          <Box
            sx={{
              position: "absolute",
              top: ASSISTANT_PANEL_HEADER_OFFSET_TOP,
              right: ASSISTANT_PANEL_HEADER_OFFSET_RIGHT,
              display: "flex",
              justifyContent: "flex-end",
              height: ASSISTANT_PANEL_HEADER_HEIGHT,
              minWidth: 0,
              maxWidth: `calc(100% - ${theme.spacing(7)})`,
              zIndex: 3,
              opacity: isCompact ? 0 : 1,
              transition: "opacity 180ms ease-out",
            }}
          >
            {userPromptPreview ? (
              <Box
                sx={{
                  maxWidth: USER_PROMPT_MAX_WIDTH,
                  ml: "auto",
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 0.5,
                }}
              >
                <EditNoteOutlinedIcon
                  sx={{
                    flexShrink: 0,
                    color: userPromptColor,
                    fontSize: 18,
                  }}
                />
                <Typography
                  sx={{
                    color: userPromptColor,
                    fontSize: 14,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  <Box component="span">{userPromptPreview.head}</Box>
                  {userPromptPreview.tail ? (
                    <>
                      <Box component="span" sx={{ px: 0.5 }}>
                        ...
                      </Box>
                      <Box component="span">{userPromptPreview.tail}</Box>
                    </>
                  ) : null}
                </Typography>
              </Box>
            ) : null}
          </Box>

          <Box
            sx={{
              position: "relative",
              height: "100%",
              minWidth: 0,
              overflow: "hidden",
              zIndex: 0,
              opacity: isCompact ? 0 : 1,
              transition:
                "opacity 220ms ease-out, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
              transform: isCompact ? "translateY(8px)" : "translateY(0)",
            }}
          >
            <Box
              ref={scrollContainerRef}
              sx={{
                height: "100%",
                overflowY: "auto",
                pr: 1,
                pt: `${ASSISTANT_PANEL_TRANSCRIPT_TOP_OFFSET}px`,
                pb: theme.spacing(6),
                display: "flex",
                flexDirection: "column",
                scrollbarWidth: "thin",
              }}
            >
              {assistantMessages.map((message, index) => (
                <Box
                  key={message.id}
                  ref={
                    index === assistantMessages.length - 1
                      ? latestAssistantMessageRef
                      : undefined
                  }
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  {index > 0 ? (
                    <Box
                      sx={{
                        alignSelf: "flex-start",
                        width: 36,
                        borderTop: `1px solid ${alpha(
                          theme.palette.common.white,
                          0.45,
                        )}`,
                        mt: 2,
                        mb: 1,
                        flexShrink: 0,
                      }}
                    />
                  ) : null}
                  <TranscriptEntry message={message} />
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: `${ASSISTANT_PANEL_TRANSCRIPT_TOP_OFFSET + 16}px`,
                pointerEvents: "none",
                background: `linear-gradient(to bottom, ${alpha(
                  theme.palette.common.black,
                  0.98,
                )} 0%, ${alpha(theme.palette.common.black, 0.82)} 38%, ${alpha(
                  theme.palette.common.black,
                  0,
                )} 100%)`,
                zIndex: 1,
              }}
            />

            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: theme.spacing(6),
                pointerEvents: "none",
                background: `linear-gradient(to bottom, ${alpha(
                  theme.palette.common.black,
                  0,
                )} 0%, ${alpha(theme.palette.common.black, 0.82)} 62%, ${alpha(
                  theme.palette.common.black,
                  0.98,
                )} 100%)`,
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
