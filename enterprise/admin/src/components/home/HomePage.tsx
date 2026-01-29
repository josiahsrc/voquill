import {
  ClassOutlined,
  GroupOutlined,
  MicOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppLogo from "../../assets/app-logo.svg?react";
import { getAppName } from "../../utils/env.utils";

const NAV_ITEMS = [
  { label: "Users", path: "/users", icon: <GroupOutlined /> },
  { label: "Global Dictionary", path: "/terms", icon: <ClassOutlined /> },
  {
    label: "Transcription Providers",
    path: "/stt-providers",
    icon: <MicOutlined />,
  },
  { label: "Settings", path: "/settings", icon: <SettingsOutlined /> },
];

const SIDEBAR_WIDTH = 300;

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Stack direction="row" sx={{ height: "100%" }}>
      <Stack
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <AppLogo width={28} height={28} style={{ marginRight: 10 }} />
          <Typography variant="h6" noWrap>
            {getAppName()}
          </Typography>
        </Toolbar>
        <List sx={{ px: 1 }}>
          {NAV_ITEMS.map(({ label, path, icon }) => (
            <ListItem key={path} disablePadding>
              <ListItemButton
                selected={location.pathname.startsWith(path)}
                onClick={() => navigate(path)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Stack>
      <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
        <Suspense>
          <Outlet />
        </Suspense>
      </Box>
    </Stack>
  );
}
