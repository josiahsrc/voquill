import { Dialog, DialogContent, Stack } from "@mui/material";
import { useAppStore } from "../../store";
import { DictateTutorial } from "./DictateTutorial";
import { FinishTutorial } from "./FinishTutorial";
import { getShouldShowTutorialDialog } from "../../utils/user.utils";

export const TutorialDialog = () => {
  const open = useAppStore(getShouldShowTutorialDialog);
  const stepIndex = useAppStore((state) => state.tutorial.pageIndex);
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} fullWidth maxWidth="sm">
      <DialogContent>
        <Stack spacing={3}>
          {stepIndex === 0 && <DictateTutorial />}
          {stepIndex === 1 && <FinishTutorial />}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
