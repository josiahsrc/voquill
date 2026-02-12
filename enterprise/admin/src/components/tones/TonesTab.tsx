import { Add, Delete, Edit, MoreVert } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import type { Tone } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  deleteGlobalTone,
  loadGlobalTones,
} from "../../actions/tones.actions";
import { useAppStore } from "../../store";
import { AppTable, type ColumnDef } from "../common/AppTable";
import { CenteredMessage } from "../common/CenteredMessage";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";
import { TabLayout } from "../common/TabLayout";
import { ToneDialog, emptyForm, formFromTone } from "./ToneDialog";

const twoLineEllipsis = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

const ToneActionsMenu = ({
  tone,
  onEdit,
}: {
  tone: Tone;
  onEdit: (tone: Tone) => void;
}) => {
  const intl = useIntl();

  const items: MenuPopoverItem[] = [
    {
      kind: "listItem",
      title: intl.formatMessage({ defaultMessage: "Edit" }),
      leading: <Edit fontSize="small" />,
      onClick: ({ close }) => {
        onEdit(tone);
        close();
      },
    },
    { kind: "divider" },
    {
      kind: "listItem",
      title: intl.formatMessage({ defaultMessage: "Delete" }),
      leading: <Delete fontSize="small" />,
      onClick: ({ close }) => {
        deleteGlobalTone(tone.id);
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

export default function TonesTab() {
  const intl = useIntl();
  const toneIds = useAppStore((state) => state.tones.toneIds);
  const toneById = useAppStore((state) => state.toneById);
  const status = useAppStore((state) => state.tones.status);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    loadGlobalTones();
  }, []);

  const tones = useMemo(
    () => toneIds.map((id) => toneById[id]).filter(Boolean) as Tone[],
    [toneIds, toneById],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (tone: Tone) => {
    setForm(formFromTone(tone));
    setDialogOpen(true);
  };

  const columns: ColumnDef<Tone>[] = [
    {
      header: intl.formatMessage({ defaultMessage: "Name" }),
      cell: (row) => <Box sx={twoLineEllipsis}>{row.name}</Box>,
      getSortKey: (row) => row.name.toLowerCase(),
      weight: 1,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Mode" }),
      cell: (row) => (
        <Box sx={twoLineEllipsis}>
          {row.isTemplateTone
            ? intl.formatMessage({ defaultMessage: "Template" })
            : intl.formatMessage({ defaultMessage: "Style" })}
        </Box>
      ),
      width: 100,
    },
    {
      header: intl.formatMessage({ defaultMessage: "System Prompt" }),
      cell: (row) => (
        <Box sx={twoLineEllipsis}>
          {row.isTemplateTone ? (row.systemPromptTemplate || "—") : "—"}
        </Box>
      ),
      weight: 2,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Prompt" }),
      cell: (row) => <Box sx={twoLineEllipsis}>{row.promptTemplate}</Box>,
      weight: 3,
    },
    {
      header: intl.formatMessage({ defaultMessage: "Actions" }),
      cell: (row) => <ToneActionsMenu tone={row} onEdit={openEdit} />,
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
      <TabLayout title={intl.formatMessage({ defaultMessage: "Global Styles" })}>
        <CenteredMessage>
          <Typography color="error">
            <FormattedMessage defaultMessage="Failed to load styles." />
          </Typography>
          <Button variant="outlined" onClick={() => loadGlobalTones()}>
            <FormattedMessage defaultMessage="Retry" />
          </Button>
        </CenteredMessage>
      </TabLayout>
    );
  }

  return (
    <TabLayout
      title={intl.formatMessage({ defaultMessage: "Global Styles" })}
      trailing={
        <Button startIcon={<Add />} variant="contained" size="small" onClick={openCreate}>
          <FormattedMessage defaultMessage="Add Style" />
        </Button>
      }
    >
      <AppTable
        rows={tones}
        columns={columns}
        defaultSortColumnIndex={0}
        fixedItemHeight={52}
        sx={{ height: "100%" }}
        emptyMessage={intl.formatMessage({ defaultMessage: "No global styles" })}
      />

      <ToneDialog
        open={dialogOpen}
        form={form}
        onFormChange={setForm}
        onClose={() => setDialogOpen(false)}
      />
    </TabLayout>
  );
}
