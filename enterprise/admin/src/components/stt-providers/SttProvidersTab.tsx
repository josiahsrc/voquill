import { Add, Delete, Edit, MoreVert } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import type { SttProvider } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
import {
  deleteSttProvider,
  loadSttProviders,
} from "../../actions/stt-providers.actions";
import { useAppStore } from "../../store";
import { AppTable, type ColumnDef } from "../common/AppTable";
import { CenteredMessage } from "../common/CenteredMessage";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
import { TabLayout } from "../common/TabLayout";
import {
  SttProviderDialog,
  emptyForm,
  formFromProvider,
} from "./SttProviderDialog";

const ProviderActionsMenu = ({
  provider,
  onEdit,
}: {
  provider: SttProvider;
  onEdit: (p: SttProvider) => void;
}) => {
  const items: MenuPopoverItem[] = [
    {
      kind: "listItem",
      title: "Edit",
      leading: <Edit fontSize="small" />,
      onClick: ({ close }) => {
        onEdit(provider);
        close();
      },
    },
    { kind: "divider" },
    {
      kind: "listItem",
      title: "Delete",
      leading: <Delete fontSize="small" />,
      onClick: ({ close }) => {
        deleteSttProvider(provider.id);
        close();
      },
    },
  ];

  return (
    <MenuPopoverBuilder items={items}>
      {({ ref, open }) => (
        <IconButton ref={ref as any} size="small" onClick={open}>
          <MoreVert fontSize="small" />
        </IconButton>
      )}
    </MenuPopoverBuilder>
  );
};

export default function SttProvidersTab() {
  const providerIds = useAppStore((state) => state.sttProviders.providerIds);
  const providerById = useAppStore((state) => state.sttProviderById);
  const status = useAppStore((state) => state.sttProviders.status);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    loadSttProviders();
  }, []);

  const providers = useMemo(
    () =>
      providerIds
        .map((id) => providerById[id])
        .filter(Boolean) as SttProvider[],
    [providerIds, providerById],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (provider: SttProvider) => {
    setForm(formFromProvider(provider));
    setDialogOpen(true);
  };

  const columns: ColumnDef<SttProvider>[] = [
    {
      header: "Name",
      cell: (row) => row.name,
      getSortKey: (row) => row.name.toLowerCase(),
      weight: 2,
    },
    {
      header: "Schema",
      cell: (row) => row.provider,
      weight: 1,
    },
    {
      header: "URL",
      cell: (row) => (
        <Box
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.url}
        </Box>
      ),
      weight: 2,
    },
    {
      header: "Model",
      cell: (row) => row.model,
      weight: 1,
    },
    {
      header: "API Key",
      cell: (row) => (row.apiKeySuffix ? `••••${row.apiKeySuffix}` : "—"),
      weight: 1,
    },
    {
      header: "Enabled",
      cell: (row) => (
        <Chip
          label={row.isEnabled ? "Yes" : "No"}
          size="small"
          color={row.isEnabled ? "success" : "default"}
          variant="outlined"
        />
      ),
      width: 90,
    },
    {
      header: "Actions",
      cell: (row) => <ProviderActionsMenu provider={row} onEdit={openEdit} />,
      width: 80,
      align: "right",
    },
  ];

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === "error") {
    return (
      <TabLayout title="Transcription Providers">
        <CenteredMessage>
          <Typography color="error">Failed to load providers.</Typography>
          <Button variant="outlined" onClick={() => loadSttProviders()}>
            Retry
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title="Transcription Providers"
      trailing={
        <Button
          startIcon={<Add />}
          variant="contained"
          size="small"
          onClick={openCreate}
        >
          Add Provider
        </Button>
      }
    >
      <AppTable
        rows={providers}
        columns={columns}
        defaultSortColumnIndex={0}
        fixedItemHeight={52}
        sx={{ height: "100%" }}
      />

      <SttProviderDialog
        open={dialogOpen}
        form={form}
        onFormChange={setForm}
        onClose={() => setDialogOpen(false)}
      />
    </TabLayout>
  );
}
