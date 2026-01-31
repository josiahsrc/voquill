import { Add, Delete, Edit, MoreVert } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import type { Term } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  deleteGlobalTerm,
  loadGlobalTerms,
} from "../../actions/terms.actions";
import { useAppStore } from "../../store";
import { AppTable, type ColumnDef } from "../common/AppTable";
import { CenteredMessage } from "../common/CenteredMessage";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
import { TabLayout } from "../common/TabLayout";
import { TermDialog, emptyForm, formFromTerm } from "./TermDialog";

const twoLineEllipsis = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

const TermActionsMenu = ({
  term,
  onEdit,
}: {
  term: Term;
  onEdit: (term: Term) => void;
}) => {
  const intl = useIntl();

  const items: MenuPopoverItem[] = [
    {
      kind: "listItem",
      title: intl.formatMessage({ defaultMessage: "Edit" }),
      leading: <Edit fontSize="small" />,
      onClick: ({ close }) => {
        onEdit(term);
        close();
      },
    },
    { kind: "divider" },
    {
      kind: "listItem",
      title: intl.formatMessage({ defaultMessage: "Delete" }),
      leading: <Delete fontSize="small" />,
      onClick: ({ close }) => {
        deleteGlobalTerm(term.id);
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

export default function TermsTab() {
  const intl = useIntl();
  const termIds = useAppStore((state) => state.terms.termIds);
  const termById = useAppStore((state) => state.termById);
  const status = useAppStore((state) => state.terms.status);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    loadGlobalTerms();
  }, []);

  const terms = useMemo(
    () => termIds.map((id) => termById[id]).filter(Boolean) as Term[],
    [termIds, termById],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (term: Term) => {
    setForm(formFromTerm(term));
    setDialogOpen(true);
  };

  const columns: ColumnDef<Term>[] = [
    {
      header: intl.formatMessage({ defaultMessage: "Source" }),
      cell: (row) => <Box sx={twoLineEllipsis}>{row.sourceValue}</Box>,
      getSortKey: (row) => row.sourceValue.toLowerCase(),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Destination" }),
      cell: (row) => <Box sx={twoLineEllipsis}>{row.isReplacement ? row.destinationValue : "—"}</Box>,
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Type" }),
      cell: (row) => (row.isReplacement ? intl.formatMessage({ defaultMessage: "Replacement" }) : intl.formatMessage({ defaultMessage: "Glossary" })),
      getSortKey: (row) => (row.isReplacement ? 1 : 0),
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Created" }),
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
      getSortKey: (row) => row.createdAt,
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Actions" }),
      cell: (row) => <TermActionsMenu term={row} onEdit={openEdit} />,
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
      <TabLayout title={intl.formatMessage({ defaultMessage: "Global Dictionary" })}>
        <CenteredMessage>
          <Typography color="error">
            <FormattedMessage defaultMessage="Failed to load terms." />
          </Typography>
          <Button variant="outlined" onClick={() => loadGlobalTerms()}>
            <FormattedMessage defaultMessage="Retry" />
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title={intl.formatMessage({ defaultMessage: "Global Dictionary" })}
      trailing={
        <Button startIcon={<Add />} variant="contained" size="small" onClick={openCreate}>
          <FormattedMessage defaultMessage="Add Term" />
        </Button>
      }
    >
      <AppTable
        rows={terms}
        columns={columns}
        defaultSortColumnIndex={0}
        fixedItemHeight={52}
        sx={{ height: "100%" }}
        emptyMessage={intl.formatMessage({ defaultMessage: "No global dictionary terms" })}
      />

      <TermDialog
        open={dialogOpen}
        form={form}
        onFormChange={setForm}
        onClose={() => setDialogOpen(false)}
      />
    </TabLayout>
  );
}
