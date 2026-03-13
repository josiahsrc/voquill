import { SendRounded } from "@mui/icons-material";
import { Box, IconButton, InputBase, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { createChatMessage } from "../../actions/chat.actions";
import { createId } from "../../utils/id.utils";
import { useAppStore } from "../../store";
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
  const [input, setInput] = useState("");

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    await createChatMessage({
      id: createId(),
      conversationId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      metadata: null,
    });
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
          <Stack spacing={1.5}>
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
            placeholder={intl.formatMessage({ defaultMessage: "Type a message…" })}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{ px: 1 }}
          />
          <IconButton onClick={handleSend} color="primary" size="small">
            <SendRounded />
          </IconButton>
        </Box>
      </Box>
    </Stack>
  );
};
