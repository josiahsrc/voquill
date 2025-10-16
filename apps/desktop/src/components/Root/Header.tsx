import { LogoutOutlined, MoreVert } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useHeaderPortal } from "../../hooks/header.hooks";
import { useIsOnboarded } from "../../hooks/user.hooks";
import { useAppStore } from "../../store";
import { getInitials } from "../../utils/string.utils";
import { getMyUser } from "../../utils/user.utils";
import { LogoWithText } from "../Common/LogoWithText";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../Common/MenuPopover";

export type BaseHeaderProps = {
  logo?: React.ReactNode;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
};

export const BaseHeader = ({
  logo,
  leftContent,
  rightContent,
}: BaseHeaderProps) => {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ py: 1, px: 2 }}
    >
      <Box sx={{ py: 0.5, pr: 1 }}>{logo}</Box>
      {leftContent}
      <Box sx={{ flexGrow: 1 }} />
      {rightContent}
    </Stack>
  );
};

export const AppHeader = () => {
  const nav = useNavigate();
  const { leftContent } = useHeaderPortal();
  const isOnboarded = useIsOnboarded();

  const myName = useAppStore((state) => {
    const user = getMyUser(state);
    return user?.name ?? "Unknown";
  });

  const myInitials = useMemo(() => getInitials(myName), [myName]);

  const handleLogoClick = () => {
    nav("/");
  };

  const sharedRightMenuItems: MenuPopoverItem[] = [
    {
      kind: "listItem",
      title: "Sign out",
      onClick: ({ close }) => {
        // handleSignOut();
        close();
      },
      leading: <LogoutOutlined />,
    },
  ];

  let rightContent: React.ReactNode;
  if (isOnboarded) {
    rightContent = (
      <MenuPopoverBuilder
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        items={sharedRightMenuItems}
      >
        {({ ref, open }) => (
          <Button
            ref={ref}
            onClick={open}
            sx={{
              display: { xs: "none", sm: "flex" },
              flexShrink: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
              }}
            >
              {myInitials}
            </Avatar>
            <Stack textAlign="left" spacing={0.5}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1}>
                {myName}
              </Typography>
              <Typography
                variant="caption"
                color="textSecondary"
                lineHeight={1}
              >
                Basic
              </Typography>
            </Stack>
          </Button>
        )}
      </MenuPopoverBuilder>
    );
  } else {
    rightContent = (
      <MenuPopoverBuilder
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        items={[...sharedRightMenuItems]}
      >
        {({ ref, open }) => (
          <IconButton ref={ref} onClick={open} size="small" color="primary">
            <MoreVert />
          </IconButton>
        )}
      </MenuPopoverBuilder>
    );
  }

  const logo = (
    <Box onClick={handleLogoClick} sx={{ cursor: "pointer" }}>
      <LogoWithText />
    </Box>
  );

  return (
    <BaseHeader
      logo={logo}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
};
