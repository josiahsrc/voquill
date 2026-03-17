import { BuildRounded } from "@mui/icons-material";
import { Box, Stack } from "@mui/material";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "../../store";
import { OverflowTypography } from "../common/OverflowTypography";
import { AgentActivity } from "./AgentActivity";

type ChatMessageBubbleProps = {
  id: string;
};

export const ChatMessageBubble = ({ id }: ChatMessageBubbleProps) => {
  const message = useAppStore((s) => s.chatMessageById[id]);
  if (!message) {
    return null;
  }

  const metadata = message.metadata as Record<string, unknown> | null;

  if (metadata?.type === "tool-result") {
    return (
      <ToolResultBubble
        toolName={metadata.toolName as string}
        reason={metadata.reason as string | undefined}
      />
    );
  }

  if (message.role === "assistant" && !message.content?.trim()) return null;

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
    </Stack>
  );
};

const ToolResultBubble = ({
  toolName,
  reason,
}: {
  toolName: string;
  reason?: string;
}) => {
  const toolInfo = useAppStore((s) => s.toolInfoById[toolName]);

  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{ px: 0.5, minWidth: 0, overflow: "hidden" }}
    >
      <BuildRounded
        sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }}
      />
      <OverflowTypography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
        {toolInfo?.description ?? toolName}
        {reason ? ` — ${reason}` : ""}
      </OverflowTypography>
    </Stack>
  );
};
