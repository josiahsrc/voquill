import { Box, Stack, Typography } from "@mui/material";
import { useAppStore } from "../../store";

type ChatMessageBubbleProps = {
  id: string;
};

export const ChatMessageBubble = ({ id }: ChatMessageBubbleProps) => {
  const message = useAppStore((s) => s.chatMessageById[id]);

  if (!message) return null;

  const isMe = message.role === "user";

  return (
    <Stack direction="row" justifyContent={isMe ? "flex-end" : "flex-start"}>
      <Box
        sx={{
          maxWidth: "75%",
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: isMe ? "primary.main" : "action.hover",
          color: isMe ? "primary.contrastText" : "text.primary",
        }}
      >
        <Typography variant="body2">{message.content}</Typography>
      </Box>
    </Stack>
  );
};
