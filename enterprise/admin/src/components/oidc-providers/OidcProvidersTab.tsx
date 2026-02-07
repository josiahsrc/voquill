import { Add, Delete, Edit, MoreVert } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import type { OidcProvider } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  deleteOidcProvider,
  loadOidcProviders,
} from "../../actions/oidc-providers.actions";
import { useAppStore } from "../../store";
import { AppTable, type ColumnDef } from "../common/AppTable";
import { CenteredMessage } from "../common/CenteredMessage";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
import { TabLayout } from "../common/TabLayout";
import {
  OidcProviderDialog,
  emptyForm,
  formFromProvider,
} from "./OidcProviderDialog";

const ProviderActionsMenu = ({
  provider,
  onEdit,
}: {
  provider: OidcProvider;
  onEdit: (p: OidcProvider) => void;
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
        deleteOidcProvider(provider.id);
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

export default function OidcProvidersTab() {
  const intl = useIntl();
  const providerIds = useAppStore((state) => state.oidcProviders.providerIds);
  const providerById = useAppStore((state) => state.oidcProviderById);
  const status = useAppStore((state) => state.oidcProviders.status);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    loadOidcProviders();
  }, []);

  const providers = useMemo(
    () =>
      providerIds
        .map((id) => providerById[id])
        .filter(Boolean) as OidcProvider[],
    [providerIds, providerById],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (provider: OidcProvider) => {
    setForm(formFromProvider(provider));
    setDialogOpen(true);
  };

  const columns: ColumnDef<OidcProvider>[] = [
    {
      header: intl.formatMessage({ defaultMessage: "Name" }),
      cell: (row) => row.name,
      getSortKey: (row) => row.name.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Issuer URL" }),
      cell: (row) => (
        <Box
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.issuerUrl}
        </Box>
      ),
      weight: 3,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Client ID" }),
      cell: (row) => (
        <Box
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.clientId}
        </Box>
      ),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Enabled" }),
      cell: (row) => (
        <Chip
          label={
            row.isEnabled
              ? intl.formatMessage({ defaultMessage: "Yes" })
              : intl.formatMessage({ defaultMessage: "No" })
          }
          size="small"
          color={row.isEnabled ? "success" : "default"}
          variant="outlined"
        />
      ),
      width: 90,
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
      <TabLayout
        title={intl.formatMessage({
          defaultMessage: "Identity Providers",
        })}
      >
        <CenteredMessage>
          <Typography color="error">
            <FormattedMessage defaultMessage="Failed to load providers." />
          </Typography>
          <Button variant="outlined" onClick={() => loadOidcProviders()}>
            <FormattedMessage defaultMessage="Retry" />
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title={intl.formatMessage({
        defaultMessage: "Identity Providers",
      })}
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
        emptyMessage={intl.formatMessage({
          defaultMessage: "No identity providers configured",
        })}
      />

      <OidcProviderDialog
        open={dialogOpen}
        form={form}
        onFormChange={setForm}
        onClose={() => setDialogOpen(false)}
      />
    </TabLayout>
  );
}
