import { CheckRounded, CloseRounded } from "@mui/icons-material";
import { Box, Chip, Stack } from "@mui/material";
import type { ChatMessage } from "@repo/types";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "../../store";
import { AgentActivity } from "./AgentActivity";

type ChatMessageBubbleProps = {
  id: string;
};

type MessageMetadata = Record<string, unknown> | null;

const getMetadataType = (metadata: MessageMetadata): string | undefined =>
  metadata?.type as string | undefined;

const ToolResultBubble = ({ message }: { message: ChatMessage }) => {
  const metadata = message.metadata as MessageMetadata;
  const toolName = (metadata?.toolName as string) ?? "tool";
  const toolInfo = useAppStore((s) => s.toolInfoById[toolName]);

  let isError = false;
  try {
    const parsed = JSON.parse(message.content);
    isError = !!parsed?.error;
  } catch {
    // not JSON
  }

  return (
    <Stack direction="row" justifyContent="flex-start">
      <Chip
        size="small"
        icon={isError ? <CloseRounded /> : <CheckRounded />}
        label={toolInfo?.description ?? toolName}
        color={isError ? "error" : "success"}
        variant="outlined"
      />
    </Stack>
  );
};

const markdownSx = {
  "& p": { m: 0 },
  "& p + p": { mt: 1 },
  "& pre": {
    my: 1,
    p: 1,
    borderRadius: 0.5,
    bgcolor: "action.selected",
    overflow: "auto",
  },
  "& code": { fontSize: "0.85em" },
  "& ul, & ol": { my: 0.5, pl: 2.5 },
  "& table": { borderCollapse: "collapse", my: 1, width: "100%" },
  "& th, & td": {
    border: 1,
    borderColor: "divider",
    px: 1,
    py: 0.5,
    textAlign: "left",
  },
  "& th": { bgcolor: "action.selected", fontWeight: 600 },
  fontSize: "0.875rem",
};

export const ChatMessageBubble = ({ id }: ChatMessageBubbleProps) => {
  const message = useAppStore((s) => s.chatMessageById[id]);
  if (!message) return null;

  const metadata = message.metadata as MessageMetadata;
  const metadataType = getMetadataType(metadata);

  if (metadataType === "tool-result") {
    return <ToolResultBubble message={message} />;
  }

  if (metadataType === "reasoning") {
    return null;
  }

  const isMe = message.role === "user";

  return (
    <Stack>
      <AgentActivity messageId={id} />
      <Stack direction="row" justifyContent={isMe ? "flex-end" : "flex-start"}>
        <Box
          sx={{
            maxWidth: "75%",
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: isMe ? "primary.main" : "action.hover",
            color: isMe ? "primary.contrastText" : "text.primary",
            ...markdownSx,
          }}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
        </Box>
      </Stack>
    </Stack>
  );
};
