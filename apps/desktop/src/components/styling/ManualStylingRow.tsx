import { Edit, InfoOutlined, PublicOutlined } from "@mui/icons-material";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { openToneEditorDialog } from "../../actions/tone.actions";
import { produceAppState, useAppStore } from "../../store";
import { ListTile } from "../common/ListTile";

export type ManualStylingRowProps = {
  id: string;
};

export const ManualStylingRow = ({ id }: ManualStylingRowProps) => {
  const tone = useAppStore((state) => getRec(state.toneById, id));

  const handleEdit = useCallback(() => {
    openToneEditorDialog({ mode: "edit", toneId: id });
  }, [id]);

  const handleViewPrompt = useCallback(() => {
    produceAppState((draft) => {
      draft.tones.viewingToneId = id;
      draft.tones.viewingToneOpen = true;
    });
  }, [id]);

  const isGlobal = tone?.isGlobal === true;
  const isSystem = tone?.isSystem === true;

  const trailing = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {isGlobal ? (
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
      )}
      {tone?.promptTemplate && (
        <Tooltip
          disableInteractive
          title={<FormattedMessage defaultMessage="View full prompt" />}
        >
          <IconButton onClick={handleViewPrompt} size="small">
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  return (
    <ListTile
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
      disableRipple
      trailing={trailing}
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1 }}
    />
  );
};
