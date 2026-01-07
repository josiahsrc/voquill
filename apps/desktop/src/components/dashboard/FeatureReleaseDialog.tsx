import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useEffect, useRef } from "react";
import { showConfetti } from "../../actions/app.actions";
import { markFeatureSeen } from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { CURRENT_FEATURE } from "../../utils/feature.utils";
import { getMyUserPreferences } from "../../utils/user.utils";

export const FeatureReleaseDialog = () => {
  const lastSeenFeature = useAppStore(
    (state) => getMyUserPreferences(state)?.lastSeenFeature,
  );
  const hasConfettiFired = useRef(false);

  const open = lastSeenFeature !== null && lastSeenFeature !== CURRENT_FEATURE;

  useEffect(() => {
    if (open && !hasConfettiFired.current) {
      hasConfettiFired.current = true;
      showConfetti();
    }
  }, [open]);

  const handleDismiss = async () => {
    await markFeatureSeen(CURRENT_FEATURE);
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} fullWidth maxWidth="sm">
      <DialogTitle>New Feature</DialogTitle>
      <DialogContent>
        {/* TODO: Add feature release content */}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDismiss} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};
