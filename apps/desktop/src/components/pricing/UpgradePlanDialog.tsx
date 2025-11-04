import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { MemberPlan } from "@repo/types";
import { useEffect } from "react";
import {
  closeUpgradePlanDialog,
  completePendingUpgrade,
  selectUpgradePlan,
  showUpgradePlanList,
} from "../../actions/pricing.actions";
import { useAppStore } from "../../store";
import { LoginForm } from "../login/LoginForm";
import { FormContainer } from "../onboarding/OnboardingShared";
import { PlanList } from "./PlanList";

export const UpgradePlanDialog = () => {
  const open = useAppStore((state) => state.pricing.upgradePlanDialog);
  const view = useAppStore((state) => state.pricing.upgradePlanDialogView);
  const pendingPlan = useAppStore(
    (state) => state.pricing.upgradePlanPendingPlan
  );
  const auth = useAppStore((state) => state.auth);

  const handleClose = () => {
    closeUpgradePlanDialog();
  };

  const handleClickPlan = (plan: MemberPlan) => {
    selectUpgradePlan(plan);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (view !== "login") {
      return;
    }

    if (!auth || !pendingPlan) {
      return;
    }

    completePendingUpgrade();
  }, [open, view, auth, pendingPlan]);

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={true}>
      {view === "plans" && (
        <>
          <DialogTitle align="center" sx={{ mt: 2 }}>
            <Typography
              component="div"
              variant="h5"
              fontWeight={700}
              sx={{ mb: 1.5 }}
            >
              Upgrade your plan
            </Typography>
            <Typography component="div" variant="body1" color="textSecondary">
              Cross-device sync, Voquill Cloud, and more advanced features.
            </Typography>
          </DialogTitle>
          <DialogContent>
            <PlanList
              onSelect={handleClickPlan}
              text="Upgrade"
              sx={{
                mt: 1,
                mb: 1,
              }}
            />
          </DialogContent>
        </>
      )}
      {view === "login" && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <FormContainer>
            <DialogTitle align="center" sx={{ mt: 2 }}>
              <Typography
                component="div"
                variant="h5"
                fontWeight={700}
                sx={{ mb: 1.5 }}
              >
                Sign in to continue
              </Typography>
              <Typography component="div" variant="body1" color="textSecondary">
                Log in and we’ll launch checkout automatically.
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <LoginForm />
            </DialogContent>
          </FormContainer>
        </Stack>
      )}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {view === "login" && (
          <Button onClick={showUpgradePlanList}>Back to plans</Button>
        )}
        <Button onClick={handleClose} variant="text">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
