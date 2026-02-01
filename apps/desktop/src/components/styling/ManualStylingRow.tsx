import {
  Deselect,
  Edit,
  InfoOutlined,
  MoreVert,
  PublicOutlined,
} from "@mui/icons-material";
import { IconButton, Radio, Stack, Tooltip, Typography } from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { openToneEditorDialog } from "../../actions/tone.actions";
import {
  deselectActiveTone,
  setSelectedToneId,
} from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import {
  getActiveManualToneIds,
  getManuallySelectedToneId,
} from "../../utils/tone.utils";
import { ListTile } from "../common/ListTile";
import {
  MenuPopoverBuilder,
  type MenuPopoverItem,
} from "../common/MenuPopover";

export type ManualStylingRowProps = {
  id: string;
};

export const ManualStylingRow = ({ id }: ManualStylingRowProps) => {
  const tone = useAppStore((state) => getRec(state.toneById, id));
  const isSelected = useAppStore(
    (state) => getManuallySelectedToneId(state) === id,
  );
  const activeToneCount = useAppStore(
    (state) => getActiveManualToneIds(state).length,
  );

  const handleEdit = useCallback(() => {
    openToneEditorDialog({ mode: "edit", toneId: id });
  }, [id]);

  const handleViewPrompt = useCallback(() => {
    produceAppState((draft) => {
      draft.tones.viewingToneId = id;
      draft.tones.viewingToneOpen = true;
    });
  }, [id]);

  const handleSelect = useCallback(() => {
    setSelectedToneId(id);
  }, [id]);

  const handleDeselect = useCallback(() => {
    deselectActiveTone(id);
  }, [id]);

  const isGlobal = tone?.isGlobal === true;
  const isSystem = tone?.isSystem === true;
  const canEdit = !isGlobal && !isSystem;
  const hasPrompt = Boolean(tone?.promptTemplate);
  const canDeselect = activeToneCount > 1;

  const menuItems = useMemo((): MenuPopoverItem[] => {
    const items: MenuPopoverItem[] = [];
    if (canEdit) {
      items.push({
        kind: "listItem",
        title: <FormattedMessage defaultMessage="Edit" />,
        leading: <Edit fontSize="small" />,
        onClick: ({ close }) => {
          close();
          handleEdit();
        },
      });
    }
    items.push({
      kind: "listItem",
      title: <FormattedMessage defaultMessage="View full prompt" />,
      leading: <InfoOutlined fontSize="small" />,
      onClick: ({ close }) => {
        close();
        handleViewPrompt();
      },
    });
    if (canDeselect) {
      items.push({
        kind: "listItem",
        title: <FormattedMessage defaultMessage="Deselect style" />,
        leading: <Deselect fontSize="small" />,
        onClick: ({ close }) => {
          close();
          handleDeselect();
        },
      });
    }
    return items;
  }, [
    canEdit,
    canDeselect,
    hasPrompt,
    handleEdit,
    handleViewPrompt,
    handleDeselect,
  ]);

  const trailing = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {isGlobal && (
        <Tooltip
          disableInteractive
          title={
            <FormattedMessage defaultMessage="This style is managed by your organization." />
          }
        >
          <span>
            <IconButton size="small" disabled>
              <PublicOutlined fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
      <MenuPopoverBuilder items={menuItems}>
        {({ ref, open }) => (
          <IconButton ref={ref} onClick={open} size="small">
            <MoreVert fontSize="small" />
          </IconButton>
        )}
      </MenuPopoverBuilder>
    </Stack>
  );

  return (
    <ListTile
      onClick={handleSelect}
      leading={
        <Radio checked={isSelected} size="small" disableRipple sx={{ mr: 1 }} />
      }
      title={tone?.name}
      subtitle={
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {tone?.promptTemplate ?? "-"}
        </Typography>
      }
      trailing={trailing}
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1 }}
    />
  );
};
