import { AddRounded } from "@mui/icons-material";
import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  createConversation,
  deleteConversation,
  loadChatMessages,
} from "../../actions/chat.actions";
import { createId } from "../../utils/id.utils";
import { ChatsSideEffects } from "./ChatsSideEffects";
import { ConversationLayout } from "./ConversationLayout";
import { ConversationListLayout } from "./ConversationListLayout";

export default function ChatsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    await loadChatMessages(id);
  };

  const intl = useIntl();

  const handleNewChat = async () => {
    const now = new Date().toISOString();
    const saved = await createConversation({
      id: createId(),
      title: intl.formatMessage({ defaultMessage: "New conversation" }),
      createdAt: now,
      updatedAt: now,
    });
    setSelectedId(saved.id);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: "100%", pb: 2, pr: 2 }}>
      <ChatsSideEffects />
      <Box
        sx={{
          height: "100%",
          overflow: "hidden",
          bgcolor: "level1",
          display: "flex",
          flexDirection: "row",
          borderRadius: 2,
        }}
      >
        <ConversationListLayout
          selectedId={selectedId}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onDelete={handleDelete}
        />

        <Divider orientation="vertical" flexItem />

        {selectedId ? (
          <ConversationLayout key={selectedId} conversationId={selectedId} />
        ) : (
          <Stack
            sx={{
              flexGrow: 1,
              minWidth: 0,
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Start a conversation to get things going" />
            </Typography>
            <Chip
              icon={<AddRounded />}
              label={<FormattedMessage defaultMessage="Create new chat" />}
              variant="outlined"
              onClick={handleNewChat}
              sx={{ mt: 1 }}
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
