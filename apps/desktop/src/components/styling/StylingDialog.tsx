import { Edit, PublicOutlined } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { getRec } from "@repo/utilities";
import { FormattedMessage } from "react-intl";
import { openToneEditorDialog } from "../../actions/tone.actions";
import { produceAppState, useAppStore } from "../../store";

const closeStylingDialog = () => {
  produceAppState((draft) => {
    draft.tones.viewingToneOpen = false;
  });
};

export const StylingDialog = () => {
  const viewingToneId = useAppStore((state) => state.tones.viewingToneId);
  const tone = useAppStore((state) =>
    viewingToneId ? getRec(state.toneById, viewingToneId) : null,
  );
  const isOpen = useAppStore((state) => state.tones.viewingToneOpen);

  const isGlobal = tone?.isGlobal === true;
  const isSystem = tone?.isSystem === true;

  const handleEdit = () => {
    if (!viewingToneId) return;
    closeStylingDialog();
    openToneEditorDialog({ mode: "edit", toneId: viewingToneId });
  };

  return (
    <Dialog open={isOpen} onClose={closeStylingDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          {tone?.name}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {isGlobal && (
              <Tooltip
                disableInteractive
                title={
                  <FormattedMessage defaultMessage="This style is managed by your organization." />
                }
              >
                <PublicOutlined fontSize="small" color="disabled" />
              </Tooltip>
            )}
            {!isGlobal && !isSystem && (
              <Tooltip
                disableInteractive
                title={<FormattedMessage defaultMessage="Edit style" />}
              >
                <IconButton size="small" onClick={handleEdit}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {tone?.promptTemplate}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={closeStylingDialog}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
