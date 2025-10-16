import {
  HomeOutlined,
  LogoutOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import { Box, List, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { ListTile } from "../Common/ListTile";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: "Home", path: "/dashboard", icon: <HomeOutlined /> },
  {
    label: "Account",
    path: "/dashboard/account",
    icon: <PersonOutlined />,
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

  const handleSignOut = () => {
    onChoose?.();
    // signOut();
  };

  const list = (
    <List
      sx={{
        px: { xs: 1, sm: 2 },
        pt: { xs: 2, sm: 0 },
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
      <Box sx={{ mt: 2, px: { xs: 1, sm: 2 }, py: 1 }}>
        <ListTile
          onClick={handleSignOut}
          leading={<LogoutOutlined />}
          title="Sign out"
        />
      </Box>
    </Stack>
  );
};
