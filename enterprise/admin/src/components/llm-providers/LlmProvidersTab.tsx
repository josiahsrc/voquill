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
import { FormattedMessage, useIntl } from "react-intl";
import {
  deleteLlmProvider,
  loadLlmProviders,
  pullLlmProvider,
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
  const intl = useIntl();

  const items: MenuPopoverItem[] = [
    {
      kind: "listItem",
      title: intl.formatMessage({ defaultMessage: "Edit" }),
      leading: <Edit fontSize="small" />,
      onClick: ({ close }) => {
        onEdit(provider);
        close();
      },
    },
    { kind: "divider" },
    {
      kind: "listItem",
      title: intl.formatMessage({ defaultMessage: "Delete" }),
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
  const intl = useIntl();
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
      header: intl.formatMessage({ defaultMessage: "Name" }),
      cell: (row) => row.name,
      getSortKey: (row) => row.name.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Provider" }),
      cell: (row) => row.provider,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "URL" }),
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
      header: intl.formatMessage({ defaultMessage: "Model" }),
      cell: (row) => row.model,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "API Key" }),
      cell: (row) => (row.apiKeySuffix ? `••••${row.apiKeySuffix}` : "—"),
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Level" }),
      cell: (row) => {
        if (row.tier === 3) {
          return (
            <Chip
              label={intl.formatMessage({ defaultMessage: "High" })}
              size="small"
              color="primary"
              variant="outlined"
            />
          );
        }
        if (row.tier === 2) {
          return (
            <Chip
              label={intl.formatMessage({ defaultMessage: "Medium" })}
              size="small"
              color="success"
              variant="outlined"
            />
          );
        }
        return (
          <Chip
            label={intl.formatMessage({ defaultMessage: "Disabled" })}
            size="small"
            color="default"
            variant="outlined"
          />
        );
      },
      width: 120,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Status" }),
      cell: (row) => {
        if (row.pullStatus === "complete") {
          return <Chip label={intl.formatMessage({ defaultMessage: "Synced" })} size="small" color="success" variant="outlined" />;
        }
        if (row.pullStatus === "error") {
          return (
            <Tooltip title={row.pullError ?? intl.formatMessage({ defaultMessage: "Unknown error" })}>
              <Chip
                label={intl.formatMessage({ defaultMessage: "Error" })}
                size="small"
                color="error"
                variant="outlined"
                onClick={() => pullLlmProvider(row.id)}
              />
            </Tooltip>
          );
        }
        return <Chip label={intl.formatMessage({ defaultMessage: "Syncing…" })} size="small" icon={<CircularProgress size={14} />} variant="outlined" />;
      },
      width: 120,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Actions" }),
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
      <TabLayout title={intl.formatMessage({ defaultMessage: "AI Providers" })}>
        <CenteredMessage>
          <Typography color="error">
            <FormattedMessage defaultMessage="Failed to load providers." />
          </Typography>
          <Button variant="outlined" onClick={() => loadLlmProviders()}>
            <FormattedMessage defaultMessage="Retry" />
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title={intl.formatMessage({ defaultMessage: "AI Providers" })}
      trailing={
        <Button
          startIcon={<Add />}
          variant="contained"
          size="small"
          onClick={openCreate}
        >
          <FormattedMessage defaultMessage="Add Provider" />
        </Button>
      }
    >
      <AppTable
        rows={providers}
        columns={columns}
        defaultSortColumnIndex={0}
        fixedItemHeight={52}
        sx={{ height: "100%" }}
        emptyMessage={intl.formatMessage({ defaultMessage: "No AI providers configured" })}
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
