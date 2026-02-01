import {
  AdminPanelSettings,
  DeleteOutline,
  InfoOutlined,
  LockResetOutlined,
  MoreVert
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import type { UserWithAuth } from "@repo/types";
import { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { loadUsers, setUserAdmin } from "../../actions/users.actions";
import { useAppStore } from "../../store";
import { AppTable, type ColumnDef } from "../common/AppTable";
import { CenteredMessage } from "../common/CenteredMessage";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
import { TabLayout } from "../common/TabLayout";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

const UserActionsMenu = ({ user }: { user: UserWithAuth }) => {
  const intl = useIntl();
  const currentUserId = useAppStore((state) => state.auth?.userId);
  const isSelf = user.id === currentUserId;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const items: MenuPopoverItem[] = [];

  if (!isSelf) {
    items.push({
      kind: "listItem",
      title: user.isAdmin
        ? intl.formatMessage({ defaultMessage: "Remove admin" })
        : intl.formatMessage({ defaultMessage: "Make admin" }),
      leading: <AdminPanelSettings fontSize="small" />,
      onClick: ({ close }) => {
        setUserAdmin(user.id, !user.isAdmin);
        close();
      },
    });
  }

  items.push({
    kind: "listItem",
    title: intl.formatMessage({ defaultMessage: "Reset password" }),
    leading: <LockResetOutlined fontSize="small" />,
    onClick: ({ close }) => {
      close();
      setResetPasswordOpen(true);
    },
  });

  items.push({
    kind: "listItem",
    title: (
      <Typography color="error">
        <FormattedMessage defaultMessage="Delete user" />
      </Typography>
    ),
    leading: <DeleteOutline fontSize="small" color="error" />,
    onClick: ({ close }) => {
      close();
      setDeleteOpen(true);
    },
  });

  return (
    <>
      <MenuPopoverBuilder items={items}>
        {({ ref, open }) => (
          <IconButton ref={ref as any} size="small" onClick={open}>
            <MoreVert fontSize="small" />
          </IconButton>
        )}
      </MenuPopoverBuilder>
      <DeleteUserDialog
        user={user}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
      <ResetPasswordDialog
        user={user}
        open={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
      />
    </>
  );
};

export default function UsersTab() {
  const intl = useIntl();
  const userIds = useAppStore((state) => state.users.userIds);
  const userById = useAppStore((state) => state.userWithAuthById);
  const status = useAppStore((state) => state.users.status);
  const license = useAppStore((state) => state.enterpriseLicense);

  const columns: ColumnDef<UserWithAuth>[] = [
    {
      header: intl.formatMessage({ defaultMessage: "Name" }),
      cell: (row) => row.name || "—",
      getSortKey: (row) => row.name.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Email" }),
      cell: (row) => row.email,
      getSortKey: (row) => row.email.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Created" }),
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
      getSortKey: (row) => row.createdAt,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Words Total" }),
      cell: (row) => row.wordsTotal.toLocaleString(),
      getSortKey: (row) => row.wordsTotal,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Permissions" }),
      cell: (row) =>
        row.isAdmin ? (
          <Chip
            label={intl.formatMessage({ defaultMessage: "Admin" })}
            size="small"
            color="primary"
          />
        ) : null,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Actions" }),
      cell: (row) => <UserActionsMenu user={row} />,
      width: 80,
      align: "right",
    },
  ];

  const users = useMemo(
    () => userIds.map((id) => userById[id]).filter(Boolean) as UserWithAuth[],
    [userIds, userById],
  );

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === "error") {
    return (
      <TabLayout title={<FormattedMessage defaultMessage="Users" />}>
        <CenteredMessage>
          <Typography color="error">
            <FormattedMessage defaultMessage="Failed to load users." />
          </Typography>
          <Button variant="outlined" onClick={() => loadUsers()}>
            <FormattedMessage defaultMessage="Retry" />
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FormattedMessage defaultMessage="Users" />
          {license && (
            <>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage
                  defaultMessage="({count} / {max} seats)"
                  values={{ count: users.length, max: license.maxSeats }}
                />
              </Typography>
              <Tooltip
                title={
                  <FormattedMessage
                    defaultMessage="Reach out to {email} to request more seats."
                    values={{
                      email: (
                        <a
                          href="mailto:enterprise@voquill.com"
                          style={{ color: "inherit" }}
                        >
                          enterprise@voquill.com
                        </a>
                      ),
                    }}
                  />
                }
                arrow
                slotProps={{ popper: { sx: { pointerEvents: "auto" } } }}
              >
                <InfoOutlined
                  sx={{
                    fontSize: 16,
                    color: "text.secondary",
                    cursor: "pointer",
                  }}
                />
              </Tooltip>
            </>
          )}
        </Box>
      }
    >
      <AppTable
        rows={users}
        columns={columns}
        defaultSortColumnIndex={0}
        fixedItemHeight={52}
        sx={{ height: "100%" }}
        emptyMessage={intl.formatMessage({ defaultMessage: "No users" })}
      />
    </TabLayout>
  );
}
