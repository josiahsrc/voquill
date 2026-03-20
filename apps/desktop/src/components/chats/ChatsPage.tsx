import { AddRounded } from "@mui/icons-material";
import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useSearchParams } from "react-router-dom";
import {
  createConversation,
  deleteConversation,
  loadChatMessages,
} from "../../actions/chat.actions";
import { useAppStore } from "../../store";
import { createId } from "../../utils/id.utils";
import { ChatsSideEffects } from "./ChatsSideEffects";
import { ConversationLayout } from "./ConversationLayout";
import { ConversationListLayout } from "./ConversationListLayout";

export default function ChatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  const conversationIds = useAppStore((s) => s.chat.conversationIds);

  useEffect(() => {
    if (!selectedId && conversationIds.length > 0) {
      const firstId = conversationIds[0];
      setSearchParams({ id: firstId }, { replace: true });
      void loadChatMessages(firstId);
    }
  }, [selectedId, conversationIds, setSearchParams]);

  useEffect(() => {
    if (selectedId) {
      void loadChatMessages(selectedId);
    }
  }, [selectedId]);

  const handleSelect = (id: string) => {
    setSearchParams({ id }, { replace: true });
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
    setSearchParams({ id: saved.id }, { replace: true });
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (selectedId === id) {
      setSearchParams({}, { replace: true });
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
