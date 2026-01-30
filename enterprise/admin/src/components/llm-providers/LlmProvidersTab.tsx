import { Add, Delete, Edit, MoreVert } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import type { LlmProvider } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
import {
  deleteLlmProvider,
  loadLlmProviders,
} from "../../actions/llm-providers.actions";
import { useAppStore } from "../../store";
import { AppTable, type ColumnDef } from "../common/AppTable";
import { CenteredMessage } from "../common/CenteredMessage";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
import { TabLayout } from "../common/TabLayout";
import {
  LlmProviderDialog,
  emptyForm,
  formFromProvider,
} from "./LlmProviderDialog";

const ProviderActionsMenu = ({
  provider,
  onEdit,
}: {
  provider: LlmProvider;
  onEdit: (p: LlmProvider) => void;
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
        deleteLlmProvider(provider.id);
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

export default function LlmProvidersTab() {
  const providerIds = useAppStore((state) => state.llmProviders.providerIds);
  const providerById = useAppStore((state) => state.llmProviderById);
  const status = useAppStore((state) => state.llmProviders.status);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    loadLlmProviders();
  }, []);

  const providers = useMemo(
    () =>
      providerIds
        .map((id) => providerById[id])
        .filter(Boolean) as LlmProvider[],
    [providerIds, providerById],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (provider: LlmProvider) => {
    setForm(formFromProvider(provider));
    setDialogOpen(true);
  };

  const columns: ColumnDef<LlmProvider>[] = [
    {
      header: "Name",
      cell: (row) => row.name,
      getSortKey: (row) => row.name.toLowerCase(),
      weight: 2,
    },
    {
      header: "Provider",
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
      header: "Pull Status",
      cell: (row) => {
        if (row.pullStatus === "complete") {
          return <Chip label="Pulled" size="small" color="success" variant="outlined" />;
        }
        if (row.pullStatus === "error") {
          return (
            <Tooltip title={row.pullError ?? "Unknown error"}>
              <Chip label="Error" size="small" color="error" variant="outlined" />
            </Tooltip>
          );
        }
        return <Chip label="Pulling…" size="small" icon={<CircularProgress size={14} />} variant="outlined" />;
      },
      width: 120,
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
      <TabLayout title="AI Providers">
        <CenteredMessage>
          <Typography color="error">Failed to load providers.</Typography>
          <Button variant="outlined" onClick={() => loadLlmProviders()}>
            Retry
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title="AI Providers"
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
        emptyMessage="No AI providers configured"
      />

      <LlmProviderDialog
        open={dialogOpen}
        form={form}
        onFormChange={setForm}
        onClose={() => setDialogOpen(false)}
      />
    </TabLayout>
  );
}
