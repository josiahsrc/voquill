import {
  HistoryOutlined,
  HomeOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import { Box, List, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { ListTile } from "../Common/ListTile";

const settingsPath = "/dashboard/settings";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: "Home", path: "/dashboard", icon: <HomeOutlined /> },
  {
    label: "History",
    path: "/dashboard/transcriptions",
    icon: <HistoryOutlined />,
  },
];

export type DashboardMenuProps = {
  onChoose?: () => void;
};

export const DashboardMenu = ({ onChoose }: DashboardMenuProps) => {
  const location = useLocation();
  const nav = useNavigate();

  const onChooseHandler = (path: string) => {
    onChoose?.();
    nav(path);
  };

  const list = (
    <List
      sx={{
        px: 2,
        pt: 2,
        pb: 8,
      }}
    >
      {navItems.map(({ label, path, icon }) => (
        <ListTile
          key={path}
          onClick={() => onChooseHandler(path)}
          selected={location.pathname === path}
          leading={icon}
          title={label}
        />
      ))}
    </List>
  );

  return (
    <Stack alignItems="stretch" sx={{ height: "100%" }}>
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>{list}</Box>
      <Box sx={{ mt: 2, p: 2 }}>
        <ListTile
          key={settingsPath}
          onClick={() => onChooseHandler(settingsPath)}
          selected={location.pathname === settingsPath}
          leading={<SettingsOutlined />}
          title="Settings"
        />
      </Box>
    </Stack>
  );
};
