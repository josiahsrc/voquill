import CloseIcon from "@mui/icons-material/Close";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import { Box, IconButton, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { emitTo } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import type { AgentWindowMessage } from "../../types/agent-window.types";
import type { OverlayPhase } from "../../types/overlay.types";

export const ASSISTANT_PANEL_OVERLAY_WIDTH = 600;
export const ASSISTANT_PANEL_OVERLAY_HEIGHT = 272;
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
const ASSISTANT_PANEL_TRANSCRIPT_TOP_OFFSET = 44;
const PANEL_SURFACE_TRANSITION =
  "opacity 220ms ease-out, transform 340ms cubic-bezier(0.22, 1, 0.36, 1)";

type AssistantModePanelProps = {
  phase: OverlayPhase;
  messages: AgentWindowMessage[];
  open: boolean;
};

const USER_PROMPT_MAX_WIDTH = "66%";
const USER_PROMPT_HEAD_WORDS = 4;
const USER_PROMPT_TAIL_WORDS = 5;

type UserPromptPreview = {
  head: string;
  tail: string | null;
};

const getLatestMessage = (
  messages: AgentWindowMessage[],
  sender: AgentWindowMessage["sender"],
) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.sender === sender) {
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

type TranscriptEntryProps = {
  message: AgentWindowMessage;
};

const TranscriptEntry = ({ message }: TranscriptEntryProps) => {
  const theme = useTheme();
  const tools = message.tools ?? [];
  const hasBody = Boolean(message.draft || message.text);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      {tools.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.25,
            mb: hasBody ? 0.5 : 0,
          }}
        >
          {tools.map((tool, index) => (
            <Typography
              key={`${tool}-${index}`}
              sx={{
                color: alpha(theme.palette.common.white, 0.46),
                fontSize: 13,
                lineHeight: 1.35,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {"\u2022"} {tool}
            </Typography>
          ))}
        </Box>
      ) : null}

      {message.draft ? (
        <Typography
          sx={{
            color: alpha(theme.palette.common.white, 0.92),
            fontSize: 14,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.draft}
        </Typography>
      ) : null}

      {message.text ? (
        <Typography
          sx={{
            color: message.isError
              ? alpha(theme.palette.error.light, 0.94)
              : alpha(theme.palette.common.white, 0.92),
            fontSize: 14,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.text}
        </Typography>
      ) : null}
    </Box>
  );
};

export const AssistantModePanel = ({
  messages,
  open,
}: AssistantModePanelProps) => {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const latestUserMessage = getLatestMessage(messages, "me");
  const userPromptPreview = latestUserMessage?.text
    ? formatUserPromptPreview(latestUserMessage.text)
    : null;
  const userPromptColor = alpha(theme.palette.common.white, 0.5);
  const assistantMessages = messages.filter(
    (message) => message.sender === "agent",
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, open]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: `${ASSISTANT_PANEL_TOP_INSET}px ${ASSISTANT_PANEL_HORIZONTAL_INSET}px ${ASSISTANT_PANEL_BOTTOM_INSET}px`,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
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
                  key={`${index}-${message.text}-${message.draft ?? ""}`}
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
                height: `${ASSISTANT_PANEL_TRANSCRIPT_TOP_OFFSET + 20}px`,
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
