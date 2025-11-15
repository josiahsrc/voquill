import {
  AccountCircleOutlined,
  ArrowUpwardOutlined,
} from "@mui/icons-material";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { useHeaderPortal } from "../../hooks/header.hooks";
import { useIsOnboarded } from "../../hooks/user.hooks";
import { produceAppState, useAppStore } from "../../store";
import {
  getIsPaying,
  getMyMember,
  planToDisplayName,
} from "../../utils/member.utils";
import { getInitials } from "../../utils/string.utils";
import { getMyUser } from "../../utils/user.utils";
import { LogoWithText } from "../common/LogoWithText";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
import { maybeArrayElements } from "../settings/AIPostProcessingConfiguration";

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
  const planName = useAppStore((state) =>
    planToDisplayName(getMyMember(state)?.plan ?? "free")
  );
  const isPaying = useAppStore(getIsPaying);

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
      title: <FormattedMessage defaultMessage="My profile" />,
      onClick: ({ close }) => {
        produceAppState((draft) => {
          draft.settings.profileDialogOpen = true;
        });
        close();
      },
      leading: <AccountCircleOutlined />,
    },
    ...maybeArrayElements<MenuPopoverItem>(!isPaying, [
      {
        kind: "listItem",
        title: <FormattedMessage defaultMessage="Upgrade to Pro" />,
        onClick: ({ close }) => {
          openUpgradePlanDialog();
          close();
        },
        leading: <ArrowUpwardOutlined />,
      },
    ]),
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
                {planName}
              </Typography>
            </Stack>
          </Button>
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
