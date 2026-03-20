import { AddRounded } from "@mui/icons-material";
import {
  Box,
  IconButton,
  List,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import { FadingScrollArea } from "../common/FadingScrollArea";
import { ConversationListItem } from "./ConversationListItem";

type ConversationListLayoutProps = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
};

export const ConversationListLayout = ({
  selectedId,
  onSelect,
  onNewChat,
  onDelete,
}: ConversationListLayoutProps) => {
  const intl = useIntl();
  const conversationIds = useAppStore((s) => s.chat.conversationIds);
  const conversationById = useAppStore((s) => s.conversationById);

  return (
    <Box
      sx={{
        width: 200,
        maxWidth: 200,
        minWidth: 200,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, pr: 1, pt: 1.5 }}
      >
        <Typography variant="subtitle2">
          <FormattedMessage defaultMessage="Chats" />
        </Typography>
        <Tooltip
          title={intl.formatMessage({ defaultMessage: "New chat" })}
          placement="top"
        >
          <IconButton size="small" color="primary" onClick={onNewChat}>
            <AddRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      {conversationIds.length === 0 ? (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="No conversations" />
          </Typography>
        </Box>
      ) : (
        <FadingScrollArea fadeHeight={16} sx={{ px: 1, py: 1 }}>
          <List disablePadding>
            {conversationIds.map((id) => {
              const conversation = conversationById[id];
              if (!conversation) return null;

              return (
                <ConversationListItem
                  key={id}
                  conversation={conversation}
                  selected={id === selectedId}
                  onSelect={() => onSelect(id)}
                  onDelete={() => onDelete(id)}
                />
              );
            })}
          </List>
        </FadingScrollArea>
      )}
    </Box>
  );
};
