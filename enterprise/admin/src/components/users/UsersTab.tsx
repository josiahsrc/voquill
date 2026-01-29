import {
  AdminPanelSettings,
  DeleteOutline,
  MoreVert,
  RemoveOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import type { UserWithAuth } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
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

const UserActionsMenu = ({ user }: { user: UserWithAuth }) => {
  const currentUserId = useAppStore((state) => state.auth?.userId);
  const isSelf = user.id === currentUserId;
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isSelf) return <RemoveOutlined fontSize="small" color="disabled" />;

  const items: MenuPopoverItem[] = [
    {
      kind: "listItem",
      title: user.isAdmin ? "Remove admin" : "Make admin",
      leading: <AdminPanelSettings fontSize="small" />,
      onClick: ({ close }) => {
        setUserAdmin(user.id, !user.isAdmin);
        close();
      },
    },
    { kind: "divider" },
    {
      kind: "listItem",
      title: <Typography color="error">Delete user</Typography>,
      leading: <DeleteOutline fontSize="small" color="error" />,
      onClick: ({ close }) => {
        close();
        setDeleteOpen(true);
      },
    },
  ];

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
    </>
  );
};

const columns: ColumnDef<UserWithAuth>[] = [
  {
    header: "Name",
    cell: (row) => row.name || "—",
    getSortKey: (row) => row.name.toLowerCase(),
    weight: 2,
  },
  {
    header: "Email",
    cell: (row) => row.email,
    getSortKey: (row) => row.email.toLowerCase(),
    weight: 2,
  },
  {
    header: "Created",
    cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    getSortKey: (row) => row.createdAt,
    weight: 1,
  },
  {
    header: "Words Total",
    cell: (row) => row.wordsTotal.toLocaleString(),
    getSortKey: (row) => row.wordsTotal,
    weight: 1,
  },
  {
    header: "Permissions",
    cell: (row) =>
      row.isAdmin ? <Chip label="Admin" size="small" color="primary" /> : null,
    weight: 1,
  },
  {
    header: "Actions",
    cell: (row) => <UserActionsMenu user={row} />,
    width: 80,
    align: "right",
  },
];

export default function UsersTab() {
  const userIds = useAppStore((state) => state.users.userIds);
  const userById = useAppStore((state) => state.userWithAuthById);
  const status = useAppStore((state) => state.users.status);

  useEffect(() => {
    loadUsers();
  }, []);

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
      <TabLayout title="Users">
        <CenteredMessage>
          <Typography color="error">Failed to load users.</Typography>
          <Button variant="outlined" onClick={() => loadUsers()}>
            Retry
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout title="Users">
      <AppTable
        rows={users}
        columns={columns}
        defaultSortColumnIndex={0}
        fixedItemHeight={52}
        sx={{ height: "100%" }}
        emptyMessage="No users"
      />
    </TabLayout>
  );
}
