import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { setUserName } from "../../actions/user.actions";
import { useMyUser } from "../../hooks/user.hooks";
import { produceAppState, useAppStore } from "../../store";

export const ProfileDialog = () => {
  const open = useAppStore((state) => state.settings.profileDialogOpen);
  const user = useMyUser();
  const initialName = user?.name ?? "";

  const [value, setValue] = useState(initialName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValue(initialName);
    setSaving(false);
  }, [open, initialName]);

  const closeDialog = useCallback(() => {
    produceAppState((draft) => {
      draft.settings.profileDialogOpen = false;
    });
  }, []);

  const trimmed = useMemo(() => value.trim(), [value]);
  const initialTrimmed = useMemo(() => initialName.trim(), [initialName]);

  const canSave = useMemo(() => {
    if (!user || saving) {
      return false;
    }

    if (trimmed.length === 0) {
      return false;
    }

    return trimmed !== initialTrimmed;
  }, [user, saving, trimmed, initialTrimmed]);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    try {
      await setUserName(trimmed);
      closeDialog();
    } catch (error) {
      console.error("Failed to save username", error);
      setSaving(false);
    }
  }, [canSave, trimmed, closeDialog]);

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="xs" fullWidth>
      <DialogTitle>My profile</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Username"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={!user || saving}
            size="small"
            fullWidth
            helperText="Used to sign things like emails and stuff"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
