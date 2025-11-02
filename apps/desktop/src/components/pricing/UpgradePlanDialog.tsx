import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { MemberPlan } from "@repo/types";
import { tryOpenPaymentDialogForPlan } from "../../actions/payment.actions";
import { closeUpgradePlanDialog } from "../../actions/pricing.actions";
import { useAppStore } from "../../store";
import { PlanList } from "./PlanList";

export const UpgradePlanDialog = () => {
  const open = useAppStore((state) => state.pricing.upgradePlanDialog ?? true);

  const handleClose = () => {
    closeUpgradePlanDialog();
  };

  const handleClickPlan = (plan: MemberPlan) => {
    tryOpenPaymentDialogForPlan(plan);
    closeUpgradePlanDialog();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle align="center" sx={{ mt: 2 }}>
        <Typography
          component="div"
          variant="h5"
          fontWeight={700}
          sx={{ mb: 1.5 }}
        >
          ✨ Upgrade your plan
        </Typography>
        <Typography component="div" variant="body1" color="textSecondary">
          Get access to the full feature set by upgrading your plan.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <PlanList
          onSelect={handleClickPlan}
          text="Subscribe"
          sx={{
            mt: 3,
            mb: 2,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="text">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
