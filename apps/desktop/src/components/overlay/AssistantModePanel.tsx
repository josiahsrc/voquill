import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import CloseIcon from "@mui/icons-material/Close";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, IconButton, Typography } from "@mui/material";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import type {
  ChatMessage,
  ToolPermission,
  ToolPermissionResolution,
} from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { StreamingMessageState } from "../../state/app.state";
import { useAppStore } from "../../store";
import type {
  OverlayPhase,
  OverlayResolvePermissionPayload,
} from "../../types/overlay.types";
import { ToolPermissionPrompt } from "../common/ToolPermissionPrompt";

const ASSISTANT_PANEL_COMPACT_WIDTH = 424;
const ASSISTANT_PANEL_COMPACT_HEIGHT = 120;
const ASSISTANT_PANEL_EXPANDED_WIDTH = 572;
const ASSISTANT_PANEL_EXPANDED_HEIGHT = 258;
const ASSISTANT_PANEL_HORIZONTAL_INSET = 14;
const ASSISTANT_PANEL_TOP_INSET = 14;
const ASSISTANT_PANEL_BOTTOM_INSET = 0;
const ASSISTANT_PANEL_RADIUS = 24;
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

const MarkdownContent = ({ text, color }: { text: string; color: string }) => {
  return (
    <Box
      sx={{
        color,
        fontSize: 14,
        lineHeight: 1.45,
        wordBreak: "break-word",
        "& p": { m: 0 },
        "& p + p": { mt: 1 },
        "& pre": {
          my: 1,
          p: 1,
          borderRadius: 0.5,
          bgcolor: "rgba(255,255,255,0.06)",
          overflow: "auto",
        },
        "& code": {
          fontSize: "0.85em",
        },
        "& ul, & ol": { my: 0.5, pl: 2.5 },
        "& table": {
          borderCollapse: "collapse",
          my: 1,
          width: "100%",
        },
        "& th, & td": {
          border: "1px solid rgba(255,255,255,0.15)",
          px: 1,
          py: 0.5,
          textAlign: "left",
        },
        "& th": {
          bgcolor: "rgba(255,255,255,0.06)",
          fontWeight: 600,
        },
        "& a": {
          color: "inherit",
          textDecoration: "underline",
        },
        "& blockquote": {
          my: 0.5,
          mx: 0,
          pl: 1.5,
          borderLeft: "2px solid rgba(255,255,255,0.25)",
          opacity: 0.8,
        },
      }}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </Box>
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
        <MarkdownContent
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

const OverlayToolResultEntry = ({ message }: { message: ChatMessage }) => {
  const theme = useTheme();
  const meta = message.metadata as Record<string, unknown> | null;
  const toolName = meta?.toolName as string | undefined;
  const reason = meta?.reason as string | undefined;
  const toolInfo = useAppStore((s) =>
    toolName ? s.toolInfoById[toolName] : undefined,
  );
  const dimColor = alpha(theme.palette.common.white, 0.5);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <BuildRoundedIcon sx={{ fontSize: 12, color: dimColor, flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: 12,
          color: dimColor,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {toolInfo?.description ?? toolName}
        {reason ? ` — ${reason}` : ""}
      </Typography>
    </Box>
  );
};

const OverlayAgentActivity = ({
  streaming,
}: {
  streaming: StreamingMessageState;
}) => {
  const theme = useTheme();
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const { toolCalls, reasoning, isStreaming } = streaming;
  const hasActivity = toolCalls.length > 0 || reasoning.length > 0;
  if (!hasActivity) return null;

  const dimColor = alpha(theme.palette.common.white, 0.5);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mb: 0.5 }}>
      {toolCalls.map((tc) => (
        <Typography
          key={tc.toolCallId}
          sx={{ fontSize: 12, fontStyle: "italic", color: dimColor }}
        >
          {tc.done ? (
            <FormattedMessage
              defaultMessage="Used {toolName}"
              values={{ toolName: tc.toolName }}
            />
          ) : (
            <FormattedMessage
              defaultMessage="Using {toolName}…"
              values={{ toolName: tc.toolName }}
            />
          )}
        </Typography>
      ))}
      {reasoning.length > 0 && (
        <Box>
          <Typography
            sx={{
              fontSize: 12,
              color: dimColor,
              cursor: "pointer",
              userSelect: "none",
              "&:hover": { textDecoration: "underline" },
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setReasoningOpen((o) => !o);
            }}
          >
            {isStreaming ? (
              <FormattedMessage defaultMessage="Thinking…" />
            ) : (
              <FormattedMessage defaultMessage="Thought process" />
            )}
          </Typography>
          {reasoningOpen && (
            <Typography
              sx={{
                fontSize: 12,
                color: dimColor,
                whiteSpace: "pre-wrap",
                mt: 0.25,
                pl: 1,
                borderLeft: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                maxHeight: 80,
                overflow: "auto",
                scrollbarWidth: "thin",
              }}
            >
              {reasoning}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

const OverlayToolPermissionCard = ({
  permission,
}: {
  permission: ToolPermission;
}) => {
  const handleResolve = (
    status: ToolPermissionResolution,
    alwaysAllow?: boolean,
  ) => {
    emitTo<OverlayResolvePermissionPayload>(
      "main",
      "overlay-resolve-permission",
      { permissionId: permission.id, status, alwaysAllow },
    ).catch(console.error);
  };

  return (
    <ToolPermissionPrompt
      permission={permission}
      variant="overlay"
      onAllow={() => handleResolve("allowed")}
      onDeny={() => handleResolve("denied")}
      onAlwaysAllow={() => handleResolve("allowed", true)}
    />
  );
};

export const AssistantModePanel = ({
  phase,
  messages,
  open,
}: AssistantModePanelProps) => {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const latestUserMessage = getLatestMessageByRole(messages, "user");
  const userPromptPreview = latestUserMessage?.content
    ? formatUserPromptPreview(latestUserMessage.content)
    : null;
  const userPromptColor = alpha(theme.palette.common.white, 0.5);
  const pillConversationId = useAppStore((s) => s.pillConversationId);
  const streamingMessageById = useAppStore((s) => s.streamingMessageById);
  const assistantMessages = messages.filter((message) => {
    if (message.role === "user") return false;
    if (message.role === "assistant" && !message.content?.trim()) {
      return !!streamingMessageById[message.id];
    }
    return true;
  });
  const toolPermissions = useAppStore((s) => s.toolPermissionById);
  const pendingPermissions = useMemo(
    () =>
      pillConversationId
        ? Object.values(toolPermissions).filter(
            (p) =>
              p.conversationId === pillConversationId && p.status === "pending",
          )
        : [],
    [toolPermissions, pillConversationId],
  );
  const isCompact = messages.length === 0 && pendingPermissions.length === 0;
  const shouldStickRef = useRef(true);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 32;
    shouldStickRef.current =
      container.scrollHeight - container.clientHeight - container.scrollTop <=
      threshold;
  };

  useEffect(() => {
    if (!open) return;
    shouldStickRef.current = true;
    requestAnimationFrame(scrollToBottom);
  }, [open]);

  useEffect(() => {
    const node = contentRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (shouldStickRef.current) {
        requestAnimationFrame(scrollToBottom);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

        {!isCompact && (
          <IconButton
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (pillConversationId) {
                emitTo("main", "open-pill-conversation", {
                  conversationId: pillConversationId,
                }).catch(console.error);
              }
              invoke("surface_main_window").catch(console.error);
              emitTo("main", "assistant-mode-close", {}).catch(console.error);
            }}
            size="small"
            sx={{
              position: "absolute",
              top: 10,
              left: 42,
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
            <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}

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
              onScroll={handleScroll}
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
              <Box ref={contentRef}>
                {assistantMessages.map((message, index) => {
                  const streaming = streamingMessageById[message.id];
                  return (
                    <Box
                      key={message.id}
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
                      {streaming ? (
                        <OverlayAgentActivity streaming={streaming} />
                      ) : null}
                      {(message.metadata as Record<string, unknown> | null)
                        ?.type === "tool-result" ? (
                        <OverlayToolResultEntry message={message} />
                      ) : (
                        <TranscriptEntry message={message} />
                      )}
                    </Box>
                  );
                })}
                {pendingPermissions.map((p) => (
                  <Box key={p.id} sx={{ mt: 1.5 }}>
                    <OverlayToolPermissionCard permission={p} />
                  </Box>
                ))}
              </Box>
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
