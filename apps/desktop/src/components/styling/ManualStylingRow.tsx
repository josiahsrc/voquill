import { Edit, PublicOutlined } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { openToneEditorDialog } from "../../actions/tone.actions";
import { useAppStore } from "../../store";
import { ListTile } from "../common/ListTile";

export type ManualStylingRowProps = {
  id: string;
};

export const ManualStylingRow = ({ id }: ManualStylingRowProps) => {
  const tone = useAppStore((state) => getRec(state.toneById, id));

  const handleEdit = useCallback(() => {
    openToneEditorDialog({ mode: "edit", toneId: id });
  }, [id]);

  const isGlobal = tone?.isGlobal === true;
  const isSystem = tone?.isSystem === true;

  const trailing = isGlobal ? (
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
  ) : isSystem ? null : (
    <IconButton onClick={handleEdit} size="small">
      <Edit fontSize="small" />
    </IconButton>
  );

  return (
    <ListTile
      title={tone?.name}
      disableRipple
      trailing={trailing}
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1 }}
    />
  );
};
