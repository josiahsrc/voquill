import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Switch,
  Typography,
} from "@mui/material";
import { ChangeEvent } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  setDictationAudioDim,
  setInteractionChimeEnabled,
} from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyUser } from "../../utils/user.utils";
import { SettingSection } from "../common/SettingSection";

export const AudioDialog = () => {
  const intl = useIntl();
  const [open, playInteractionChime, dictationAudioDim] = useAppStore(
    (state) => {
      const user = getMyUser(state);
      return [
        state.settings.audioDialogOpen,
        user?.playInteractionChime ?? true,
        state.userPrefs?.dictationAudioDim ?? 1.0,
      ] as const;
    },
  );

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.audioDialogOpen = false;
    });
  };

  const handleToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    void setInteractionChimeEnabled(enabled);
  };

  const handleAudioDimChange = (_event: Event, value: number | number[]) => {
    const v = typeof value === "number" ? value : value[0];
    void setDictationAudioDim(v);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        <FormattedMessage defaultMessage="Audio" />
      </DialogTitle>
      <DialogContent sx={{ minWidth: 360 }}>
        <SettingSection
          title={<FormattedMessage defaultMessage="Interaction chime" />}
          description={
            <FormattedMessage defaultMessage="Play a sound when you start or stop recording." />
          }
          action={
            <Switch
              edge="end"
              checked={playInteractionChime}
              onChange={handleToggle}
            />
          }
        />
        <Box sx={{ mt: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            <FormattedMessage defaultMessage="Dim audio while dictating" />
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <FormattedMessage defaultMessage="Lower system volume while recording, then restore it when done." />
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Slider
              value={dictationAudioDim}
              onChange={handleAudioDimChange}
              min={0}
              max={1}
              step={0.05}
              aria-label={intl.formatMessage({
                defaultMessage: "Dictation audio dim level",
              })}
              sx={{ flex: 1 }}
            />
            <Typography
              variant="body2"
              sx={{ minWidth: 40, textAlign: "right" }}
            >
              {Math.round(dictationAudioDim * 100)}%
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
