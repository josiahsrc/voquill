import { SendRounded } from "@mui/icons-material";
import {
  Box,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { ChatMessage } from "./ChatMessage";

type Message = {
  id: string;
  content: string;
  isMe: boolean;
};

type Chat = {
  id: string;
  date: string;
  messages: Message[];
};

const mockChats: Chat[] = [
  {
    id: "1",
    date: "Mar 12, 2026",
    messages: [
      { id: "1", content: "Hey! How's the project going?", isMe: false },
      { id: "2", content: "Pretty well — just finished the dictation feature.", isMe: true },
      { id: "3", content: "Nice, can I try it out?", isMe: false },
      { id: "4", content: "Sure, I'll send you a build later today.", isMe: true },
      { id: "5", content: "Awesome, looking forward to it!", isMe: false },
      { id: "6", content: "By the way, did you see the new designs?", isMe: false },
      { id: "7", content: "Yeah, the updated color palette looks great.", isMe: true },
      { id: "8", content: "I think we should also tweak the font sizes.", isMe: false },
      { id: "9", content: "Agreed, the body text feels a bit small on desktop.", isMe: true },
      { id: "10", content: "I'll update the theme tokens tomorrow.", isMe: false },
      { id: "11", content: "Perfect. Want to pair on the API integration after?", isMe: true },
      { id: "12", content: "Sure, let's do it after standup.", isMe: false },
      { id: "13", content: "Sounds good. I'll prep the endpoint docs.", isMe: true },
      { id: "14", content: "One more thing — the CI pipeline is flaky again.", isMe: false },
      { id: "15", content: "Ugh, I'll take a look at the test runner config.", isMe: true },
    ],
  },
  {
    id: "2",
    date: "Mar 11, 2026",
    messages: [
      { id: "1", content: "Hey, are you free to review a PR?", isMe: false },
      { id: "2", content: "Yeah, send it over.", isMe: true },
      { id: "3", content: "It's the auth refactor — pretty big diff.", isMe: false },
      { id: "4", content: "No worries, I'll carve out some time this afternoon.", isMe: true },
      { id: "5", content: "Let me know when the PR is up.", isMe: false },
    ],
  },
  {
    id: "3",
    date: "Mar 10, 2026",
    messages: [
      { id: "1", content: "Did you see the new office layout?", isMe: false },
      { id: "2", content: "Yeah, not sure how I feel about the open floor plan.", isMe: true },
      { id: "3", content: "Same. At least there are phone booths now.", isMe: false },
      { id: "4", content: "I'll probably just work from home more honestly.", isMe: true },
      { id: "5", content: "Haha fair enough.", isMe: false },
    ],
  },
  {
    id: "4",
    date: "Mar 8, 2026",
    messages: [
      { id: "1", content: "Lunch at the new ramen place?", isMe: false },
      { id: "2", content: "I'm down, what time?", isMe: true },
      { id: "3", content: "12:30?", isMe: false },
      { id: "4", content: "Works for me.", isMe: true },
      { id: "5", content: "See you there!", isMe: false },
    ],
  },
];

export default function ChatsPage() {
  const [selectedChatId, setSelectedChatId] = useState(mockChats[0].id);
  const selectedChat = mockChats.find((c) => c.id === selectedChatId)!;
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
  };

  return (
    <Box sx={{ flexGrow: 1, height: "100%", pb: 2, pr: 2 }}>
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
      <Box
        sx={{
          width: 200,
          maxWidth: 200,
          minWidth: 200,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <List sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          {mockChats.map((chat) => (
            <ListItemButton
              key={chat.id}
              selected={chat.id === selectedChatId}
              onClick={() => setSelectedChatId(chat.id)}
              sx={{ borderRadius: 1, py: 0.75, px: 1.5 }}
            >
              <Box sx={{ overflow: "hidden" }}>
                <Typography variant="body2" noWrap lineHeight={1.3}>
                  {chat.messages[0]?.content}
                </Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                  {chat.date}
                </Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider orientation="vertical" flexItem />

      <Stack
        sx={{
          flexGrow: 1,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 32,
              background: (theme) =>
                `linear-gradient(${theme.vars?.palette.level1}, transparent)`,
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{ height: "100%", overflowY: "auto", pt: 5, pb: 5, px: 2 }}
          >
            <Stack spacing={1.5}>
              {selectedChat.messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  content={msg.content}
                  isMe={msg.isMe}
                />
              ))}
            </Stack>
          </Box>
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 32,
              background: (theme) =>
                `linear-gradient(transparent, ${theme.vars?.palette.level1})`,
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <InputBase
              fullWidth
              placeholder="Type a message…"
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
      </Box>
    </Box>
  );
}
