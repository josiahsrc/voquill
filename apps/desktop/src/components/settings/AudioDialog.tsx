import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Switch,
} from "@mui/material";
import { ChangeEvent } from "react";
import { setInteractionChimeEnabled } from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyUser } from "../../utils/user.utils";
import { SettingSection } from "../common/SettingSection";

export const AudioDialog = () => {
  const [open, playInteractionChime] = useAppStore((state) => {
    const user = getMyUser(state);
    return [
      state.settings.audioDialogOpen,
      user?.playInteractionChime ?? true,
    ] as const;
  });

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.audioDialogOpen = false;
    });
  };

  const handleToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    void setInteractionChimeEnabled(enabled);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Audio</DialogTitle>
      <DialogContent sx={{ minWidth: 360 }}>
        <SettingSection
          title="Interaction chime"
          description="Play a sound when you start or stop recording."
          action={
            <Switch
              edge="end"
              checked={playInteractionChime}
              onChange={handleToggle}
            />
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
