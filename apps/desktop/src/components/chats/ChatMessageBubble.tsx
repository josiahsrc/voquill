import { Box, Stack } from "@mui/material";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
          "& p": { m: 0 },
          "& p + p": { mt: 1 },
          "& pre": {
            my: 1,
            p: 1,
            borderRadius: 0.5,
            bgcolor: "action.selected",
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
            border: 1,
            borderColor: "divider",
            px: 1,
            py: 0.5,
            textAlign: "left",
          },
          "& th": {
            bgcolor: "action.selected",
            fontWeight: 600,
          },
          fontSize: "0.875rem",
        }}
      >
        <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
      </Box>
    </Stack>
  );
};
