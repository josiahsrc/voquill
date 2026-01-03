import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOverlayClickThrough } from "../../hooks/overlay.hooks";
import { useAppStore } from "../../store";
import type { AgentWindowMessage } from "../../types/agent-window.types";
import { AudioWaveform } from "../common/AudioWaveform";

const AGENT_OVERLAY_WIDTH = 300;
const LEFT_MARGIN = 16;
const TOP_MARGIN = 16;
const MAX_PAPER_HEIGHT = 600; // Must match Rust: AGENT_OVERLAY_HEIGHT - TOP_MARGIN * 2

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
            }}
          >
            {message.text}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Agent messages - no bubble, just inline text
  return (
    <Typography
      variant="body2"
      sx={{
        color: "text.primary",
        lineHeight: 1.5,
        wordBreak: "break-word",
        fontSize: "0.8125rem",
        mb: 1,
      }}
    >
      {message.text}
    </Typography>
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

export const AgentOverlayRend = () => {
  const theme = useTheme();
  const windowRef = useMemo(() => getCurrentWindow(), []);
  const phase = useAppStore((state) => state.agent.overlayPhase);
  const levels = useAppStore((state) => state.audioLevels);
  const windowState = useAppStore((state) => state.agent.windowState);
  const messages = windowState?.messages ?? [];

  const isVisible = phase !== "idle";
  const isRecording = phase === "recording";
  const isLoading = phase === "loading";

  const [animationKey, setAnimationKey] = useState(0);
  const paperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [wasRecording, setWasRecording] = useState(false);
  const prevMessagesLengthRef = useRef(0);

  useOverlayClickThrough({
    contentRef: paperRef,
    enabled: isVisible,
    windowRef,
  });

  const handleClose = useCallback(() => {
    emitTo("main", "agent-overlay-close", {}).catch(console.error);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";

    windowRef.hide().catch(console.error);
  }, [windowRef]);

  // Trigger animation when becoming visible
  useEffect(() => {
    if (isVisible) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [isVisible]);

  // Track when recording starts
  useEffect(() => {
    if (isRecording) {
      setWasRecording(true);
    }
  }, [isRecording]);

  // Reset wasRecording when a new user message appears or phase goes idle
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

  // Auto-scroll to bottom when messages change or indicators appear
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isRecording, isLoading, wasRecording]);

  useEffect(() => {
    let canceled = false;

    const syncVisibility = async () => {
      try {
        if (isVisible) {
          if (canceled) {
            return;
          }

          await windowRef.show();
          await windowRef.setAlwaysOnTop(true);
        } else {
          await windowRef.hide();
        }
      } catch (err) {
        if (!canceled) {
          console.error("Failed to toggle agent overlay visibility", err);
        }
      }
    };

    syncVisibility().catch(() => {});

    return () => {
      canceled = true;
    };
  }, [windowRef, isVisible]);

  if (!isVisible) {
    return null;
  }

  // Determine which live indicator to show at the bottom
  const lastMessage = messages[messages.length - 1];
  const showUserRecordingBubble = isRecording;
  const showUserProcessingBubble = isLoading && wasRecording;
  const showAgentThinkingBubble =
    isLoading && !wasRecording && lastMessage?.sender === "me";

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        pointerEvents: "none",
        backgroundColor: "transparent",
        paddingLeft: `${LEFT_MARGIN}px`,
        paddingTop: `${TOP_MARGIN}px`,
        paddingBottom: `${TOP_MARGIN}px`,
      }}
    >
      <Paper
        ref={paperRef}
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
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            width: 24,
            height: 24,
            zIndex: 1,
            backgroundColor: alpha(theme.palette.grey[500], 0.1),
            "&:hover": {
              backgroundColor: alpha(theme.palette.grey[500], 0.2),
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Box
          ref={scrollContainerRef}
          sx={{
            padding: theme.spacing(1.5),
            paddingTop: theme.spacing(4),
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
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
        </Box>
      </Paper>
    </Box>
  );
};
