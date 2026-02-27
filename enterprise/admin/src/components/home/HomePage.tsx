import {
  AutoFixHighOutlined,
  BarChartOutlined,
  ClassOutlined,
  GroupOutlined,
  MicOutlined,
  PaletteOutlined,
  SettingsOutlined,
  VpnKeyOutlined,
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
import { useIntl } from "react-intl";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppLogo from "../../assets/app-logo.svg?react";
import { getAppName } from "../../utils/env.utils";
import HomeSideEffects from "./HomeSideEffects";
import UserInfoDialog from "./UserInfoDialog";

const SIDEBAR_WIDTH = 300;

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const intl = useIntl();

  const navItems = [
    {
      label: intl.formatMessage({ defaultMessage: "Users" }),
      path: "/users",
      icon: <GroupOutlined />,
    },
    {
      label: intl.formatMessage({ defaultMessage: "Global Dictionary" }),
      path: "/terms",
      icon: <ClassOutlined />,
    },
    {
      label: intl.formatMessage({ defaultMessage: "Global Styles" }),
      path: "/tones",
      icon: <PaletteOutlined />,
    },
    {
      label: intl.formatMessage({ defaultMessage: "Transcription Providers" }),
      path: "/stt-providers",
      icon: <MicOutlined />,
    },
    {
      label: intl.formatMessage({ defaultMessage: "AI Providers" }),
      path: "/llm-providers",
      icon: <AutoFixHighOutlined />,
    },
    {
      label: intl.formatMessage({ defaultMessage: "Identity Providers" }),
      path: "/oidc-providers",
      icon: <VpnKeyOutlined />,
    },
    {
      label: intl.formatMessage({ defaultMessage: "Usage Metrics" }),
      path: "/metrics",
      icon: <BarChartOutlined />,
    },
    {
      label: intl.formatMessage({ defaultMessage: "Settings" }),
      path: "/settings",
      icon: <SettingsOutlined />,
    },
  ];

  return (
    <Stack direction="row" sx={{ height: "100%" }}>
      <HomeSideEffects />
      <UserInfoDialog />
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
          {navItems.map(({ label, path, icon }) => (
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
