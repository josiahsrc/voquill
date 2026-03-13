import { SendRounded } from "@mui/icons-material";
import { Box, IconButton, InputBase, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { sendChatMessage } from "../../actions/chat.actions";
import { useAppStore } from "../../store";
import { getLogger } from "../../utils/log.utils";
import { FadingScrollArea } from "../common/FadingScrollArea";
import { ChatMessageBubble } from "./ChatMessageBubble";

type ConversationLayoutProps = {
  conversationId: string;
};

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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
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
        height: "100%",
        overflow: "hidden",
      }}
    >
      <FadingScrollArea fadeHeight={32} sx={{ pt: 5, pb: 5, px: 2 }}>
        {messageIds.length === 0 ? (
          <Box
            sx={{
              height: "100%",
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
          <Stack spacing={1.5} ref={scrollRef}>
            {messageIds.map((id) => (
              <ChatMessageBubble key={id} id={id} />
            ))}
          </Stack>
        )}
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
            disabled={!sidecarRunning || sending}
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
