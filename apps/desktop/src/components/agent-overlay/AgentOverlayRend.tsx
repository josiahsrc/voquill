import { Box, LinearProgress, Paper, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo } from "react";
import { useAppStore } from "../../store";
import type { AgentWindowMessage } from "../../types/agent-window.types";
import { AudioWaveform } from "../common/AudioWaveform";

const AGENT_OVERLAY_WIDTH = 300;
const AGENT_OVERLAY_HEIGHT = 200;
const LEFT_MARGIN = 16;
const TOP_MARGIN = 16;

type MessageBubbleProps = {
  message: AgentWindowMessage;
};

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const theme = useTheme();
  const isMe = message.sender === "me";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isMe ? "flex-end" : "flex-start",
        mb: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: "85%",
          padding: theme.spacing(1, 1.5),
          borderRadius: 2,
          backgroundColor: isMe
            ? alpha(theme.palette.primary.main, 0.15)
            : alpha(theme.palette.grey[500], 0.15),
          borderBottomRightRadius: isMe ? 4 : undefined,
          borderBottomLeftRadius: isMe ? undefined : 4,
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

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";

    const initialize = async () => {
      try {
        await windowRef.setIgnoreCursorEvents(true);
        await windowRef.hide();
      } catch (err) {
        console.error("Failed to initialize agent overlay window", err);
      }
    };

    initialize().catch(() => {});
  }, [windowRef]);

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
          await windowRef.setIgnoreCursorEvents(true);
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
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: `${AGENT_OVERLAY_WIDTH}px`,
          height: `${AGENT_OVERLAY_HEIGHT}px`,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: theme.spacing(1.5),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            minHeight: 48,
          }}
        >
          {isLoading ? (
            <Box sx={{ width: "80%" }}>
              <LinearProgress sx={{ height: 3, borderRadius: 1.5 }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 120,
                height: 36,
                position: "relative",
              }}
            >
              <AudioWaveform
                levels={levels}
                active={isRecording}
                processing={isLoading}
                strokeColor={theme.vars?.palette.primary.main}
                strokeWidth={2}
                width={120}
                height={36}
              />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            padding: theme.spacing(1.5),
            overflow: "auto",
            display: "flex",
            flexDirection: "column-reverse",
            justifyContent: messages.length > 0 ? "flex-end" : "center",
          }}
        >
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              {isRecording ? "Listening..." : "Processing..."}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
