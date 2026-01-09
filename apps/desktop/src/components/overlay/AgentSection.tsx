import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { emitTo } from "@tauri-apps/api/event";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useOverlayDrag } from "../../hooks/overlay.hooks";
import { useAppStore } from "../../store";
import type { AgentWindowMessage } from "../../types/agent-window.types";
import { AudioWaveform } from "../common/AudioWaveform";

const AGENT_OVERLAY_WIDTH = 300;
const LEFT_MARGIN = 16;
const TOP_MARGIN = 16;
const MAX_PAPER_HEIGHT = 600;
const HEADER_HEIGHT = 40;

const fadeInScale = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const bubbleFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

type MessageBubbleProps = {
  message: AgentWindowMessage;
};

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const theme = useTheme();
  const isMe = message.sender === "me";

  if (isMe) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mb: 1,
        }}
      >
        <Box
          sx={{
            maxWidth: "85%",
            padding: theme.spacing(1, 1.5),
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.grey[500], 0.15),
            borderBottomRightRadius: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              lineHeight: 1.4,
              wordBreak: "break-word",
              fontSize: "0.8125rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.text}
          </Typography>
        </Box>
      </Box>
    );
  }

  const draft = message.draft;

  if (message.isError) {
    return (
      <Box
        sx={{
          padding: theme.spacing(1, 1.5),
          borderRadius: 1,
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          mb: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "error.main",
            lineHeight: 1.5,
            wordBreak: "break-word",
            fontSize: "0.8125rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {message.text}
        </Typography>
      </Box>
    );
  }

  const tools = message.tools ?? [];
  const hasTools = tools.length > 0;
  const hasDraft = !!draft;

  return (
    <Box sx={{ mb: 1 }}>
      {hasTools && (
        <Box sx={{ mb: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              lineHeight: 1.4,
              fontSize: "0.75rem",
            }}
          >
            Tools used ({tools.length})
          </Typography>
          {tools.map((tool, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{
                color: "text.secondary",
                lineHeight: 1.4,
                fontSize: "0.75rem",
                pl: 1,
              }}
            >
              • {tool}
            </Typography>
          ))}
        </Box>
      )}
      {hasDraft && (
        <Box
          sx={{
            mb: 1,
            padding: theme.spacing(1.5),
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            borderLeft: `3px solid ${theme.palette.primary.main}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "primary.main",
              fontWeight: 500,
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "block",
              mb: 0.5,
            }}
          >
            Draft
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              lineHeight: 1.5,
              wordBreak: "break-word",
              fontSize: "0.8125rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {draft}
          </Typography>
        </Box>
      )}
      <Typography
        variant="body2"
        sx={{
          color: "text.primary",
          lineHeight: 1.5,
          wordBreak: "break-word",
          fontSize: "0.8125rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {message.text}
      </Typography>
    </Box>
  );
};

type UserRecordingBubbleProps = {
  levels: number[];
  isProcessing: boolean;
};

const UserRecordingBubble = ({
  levels,
  isProcessing,
}: UserRecordingBubbleProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        alignSelf: "flex-end",
        width: 100,
        height: 40,
        padding: theme.spacing(1, 1.5),
        borderRadius: 1,
        backgroundColor: alpha(theme.palette.grey[500], 0.15),
        borderBottomRightRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: 1,
        animation: `${bubbleFadeIn} 0.15s ease-out`,
        paddingLeft: -16,
        paddingRight: -16,
      }}
    >
      {isProcessing ? (
        <LinearProgress
          sx={{
            width: 60,
            height: 3,
            borderRadius: 1.5,
          }}
        />
      ) : (
        <Box
          sx={{
            width: 60,
            height: 20,
            maskImage:
              "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
          }}
        >
          <AudioWaveform
            levels={levels}
            active={true}
            processing={false}
            strokeColor={theme.vars?.palette.primary.main}
            strokeWidth={2}
            width={60}
            height={20}
          />
        </Box>
      )}
    </Box>
  );
};

const AgentThinkingBubble = () => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        mb: 1,
        animation: `${bubbleFadeIn} 0.15s ease-out`,
      }}
    >
      <CircularProgress size={16} thickness={4} />
    </Box>
  );
};

export const AgentSection = forwardRef<HTMLDivElement>((_, ref) => {
  const theme = useTheme();
  const phase = useAppStore((state) => state.agent.overlayPhase);
  const levels = useAppStore((state) => state.audioLevels);
  const windowState = useAppStore((state) => state.agent.windowState);
  const messages = windowState?.messages ?? [];

  const isVisible = phase !== "idle";
  const isRecording = phase === "recording";
  const isLoading = phase === "loading";

  const [animationKey, setAnimationKey] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [wasRecording, setWasRecording] = useState(false);
  const prevMessagesLengthRef = useRef(0);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const {
    offset: dragOffset,
    isDragging,
    handleDragStart,
  } = useOverlayDrag({
    elementWidth: AGENT_OVERLAY_WIDTH,
    headerHeight: HEADER_HEIGHT,
    initialMargin: { left: LEFT_MARGIN, top: TOP_MARGIN },
  });

  const handleClose = useCallback(() => {
    emitTo("main", "agent-overlay-close", {}).catch(console.error);
  }, []);

  useEffect(() => {
    if (isVisible) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isRecording) {
      setWasRecording(true);
    }
  }, [isRecording]);

  useEffect(() => {
    if (phase === "idle") {
      setWasRecording(false);
      prevMessagesLengthRef.current = 0;
      return;
    }

    const newUserMessage =
      messages.length > prevMessagesLengthRef.current &&
      messages[messages.length - 1]?.sender === "me";

    if (newUserMessage) {
      setWasRecording(false);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [phase, messages]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isRecording, isLoading, wasRecording]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
      setCanScrollDown(!isAtBottom && scrollHeight > clientHeight);
    };

    checkScroll();
    container.addEventListener("scroll", checkScroll);
    return () => container.removeEventListener("scroll", checkScroll);
  }, [messages, isVisible]);

  if (!isVisible) {
    return null;
  }

  const lastMessage = messages[messages.length - 1];
  const showUserRecordingBubble = isRecording;
  const showUserProcessingBubble = isLoading && wasRecording;
  const showAgentThinkingBubble =
    isLoading && !wasRecording && lastMessage?.sender === "me";
  const showFinishButton =
    !isRecording && !showUserProcessingBubble && !showAgentThinkingBubble;

  return (
    <Box
      sx={{
        position: "absolute",
        top: `${TOP_MARGIN + dragOffset.y}px`,
        left: `${LEFT_MARGIN + dragOffset.x}px`,
        bottom: `${TOP_MARGIN - dragOffset.y}px`,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        pointerEvents: "none",
      }}
    >
      <Paper
        ref={ref}
        key={animationKey}
        elevation={4}
        sx={{
          width: `${AGENT_OVERLAY_WIDTH}px`,
          maxHeight: `${MAX_PAPER_HEIGHT}px`,
          borderRadius: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "background.paper",
          animation: `${fadeInScale} 0.2s ease-out`,
          transformOrigin: "top left",
          position: "relative",
          pointerEvents: "auto",
        }}
      >
        <Box
          onMouseDown={handleDragStart}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: HEADER_HEIGHT,
            background: `linear-gradient(to bottom, ${theme.vars?.palette.background.paper} 0%, ${theme.vars?.palette.background.paper} 50%, transparent 100%)`,
            zIndex: 1,
            display: "flex",
            alignItems: "flex-start",
            padding: theme.spacing(0.5),
            pointerEvents: "auto",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              width: 24,
              height: 24,
              pointerEvents: "auto",
              backgroundColor: alpha(theme.palette.grey[500], 0.1),
              "&:hover": {
                backgroundColor: alpha(theme.palette.grey[500], 0.2),
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Box
          ref={scrollContainerRef}
          sx={{
            padding: theme.spacing(1.5),
            paddingTop: theme.spacing(5),
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <MessageBubble
            message={{ sender: "agent", text: "What can I help you with?" }}
          />

          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}

          {showUserRecordingBubble && (
            <UserRecordingBubble levels={levels} isProcessing={false} />
          )}

          {showUserProcessingBubble && (
            <UserRecordingBubble levels={levels} isProcessing={true} />
          )}

          {showAgentThinkingBubble && <AgentThinkingBubble />}

          {showFinishButton && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: 1,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                onClick={handleClose}
                sx={{
                  textTransform: "none",
                  fontSize: "0.8125rem",
                }}
              >
                Finish
              </Button>
            </Box>
          )}
        </Box>
        {canScrollDown && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background: `linear-gradient(to top, ${theme.vars?.palette.background.paper} 0%, ${theme.vars?.palette.background.paper} 50%, transparent 100%)`,
              zIndex: 1,
              pointerEvents: "none",
              borderBottomLeftRadius: "inherit",
              borderBottomRightRadius: "inherit",
            }}
          />
        )}
      </Paper>
    </Box>
  );
});

AgentSection.displayName = "AgentSection";
