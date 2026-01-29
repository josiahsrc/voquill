import AppLogo from "../../assets/app-logo.svg?react";
import { AppBar, Toolbar, Typography, Box, Tabs, Tab } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getAppName } from "../../utils/env.utils";

const TABS = [
  { label: "Users", path: "/users" },
  { label: "Terms", path: "/terms" },
  { label: "Settings", path: "/settings" },
];

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabIndex = TABS.findIndex((t) => location.pathname.startsWith(t.path));
  const currentTab = tabIndex === -1 ? 0 : tabIndex;

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: "level2" }}>
        <Toolbar>
          <AppLogo width={32} height={32} style={{ marginRight: 12 }} />
          <Typography variant="h6">{getAppName()}</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={currentTab} onChange={(_, v) => navigate(TABS[v].path)}>
          {TABS.map((t) => (
            <Tab key={t.path} label={t.label} />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ p: 3 }}>
        <Outlet />
      </Box>
    </>
  );
}
