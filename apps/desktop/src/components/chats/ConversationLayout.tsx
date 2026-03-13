import { SendRounded } from "@mui/icons-material";
import { Box, IconButton, InputBase, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { sendChatMessage } from "../../actions/chat.actions";
import { useAppStore } from "../../store";
import { getLogger } from "../../utils/log.utils";
import { FadingScrollArea } from "../common/FadingScrollArea";
import { ChatMessageBubble } from "./ChatMessageBubble";

type ConversationLayoutProps = {
  conversationId: string;
};

const AUTO_SCROLL_THRESHOLD_PX = 32;

const isNearBottom = (node: HTMLDivElement) =>
  node.scrollHeight - node.clientHeight - node.scrollTop <=
  AUTO_SCROLL_THRESHOLD_PX;

export const ConversationLayout = ({
  conversationId,
}: ConversationLayoutProps) => {
  const intl = useIntl();
  const messageIds = useAppStore(
    (s) => s.chatMessageIdsByConversationId[conversationId] ?? [],
  );
  const sidecarRunning = useAppStore((s) => s.aiSidecar.status === "running");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const node = scrollViewportRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const node = scrollViewportRef.current;
    if (!node) return;
    shouldStickToBottomRef.current = isNearBottom(node);
  }, []);

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    const frameId = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(frameId);
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollToBottom();
    }
  }, [messageIds.length, scrollToBottom]);

  useEffect(() => {
    const contentNode = contentRef.current;
    const viewportNode = scrollViewportRef.current;
    if (!contentNode || !viewportNode || typeof ResizeObserver === "undefined")
      return;

    const observer = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        requestAnimationFrame(scrollToBottom);
      }
    });

    observer.observe(contentNode);
    observer.observe(viewportNode);

    return () => observer.disconnect();
  }, [conversationId, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    shouldStickToBottomRef.current = true;
    setInput("");
    setSending(true);

    try {
      await sendChatMessage(conversationId, text);
    } catch (error) {
      getLogger().error("Failed to send message", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack
      sx={{
        flexGrow: 1,
        minWidth: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <FadingScrollArea
        fadeHeight={32}
        viewportRef={scrollViewportRef}
        onScroll={handleScroll}
        sx={{ pt: 5, pb: 5, px: 2 }}
      >
        <Stack
          ref={contentRef}
          sx={{ minHeight: "100%", justifyContent: "flex-end" }}
        >
          {messageIds.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage defaultMessage="No messages yet" />
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {messageIds.map((id) => (
                <ChatMessageBubble key={id} id={id} />
              ))}
            </Stack>
          )}
        </Stack>
      </FadingScrollArea>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        >
          <InputBase
            fullWidth
            placeholder={intl.formatMessage({
              defaultMessage: "Type a message…",
            })}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!sidecarRunning}
            sx={{ px: 1 }}
          />
          <IconButton
            onClick={handleSend}
            color="primary"
            size="small"
            disabled={!sidecarRunning || sending}
          >
            <SendRounded />
          </IconButton>
        </Box>
      </Box>
    </Stack>
  );
};
