import { Box, Stack, Typography } from "@mui/material";

export type ChatMessageProps = {
  content: string;
  isMe: boolean;
};

export const ChatMessage = ({ content, isMe }: ChatMessageProps) => {
  return (
    <Stack
      direction="row"
      justifyContent={isMe ? "flex-end" : "flex-start"}
    >
      <Box
        sx={{
          maxWidth: "75%",
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: isMe ? "primary.main" : "action.hover",
          color: isMe ? "primary.contrastText" : "text.primary",
        }}
      >
        <Typography variant="body2">{content}</Typography>
      </Box>
    </Stack>
  );
};
