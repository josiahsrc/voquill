import { RocketLaunch } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { markUpgradeDialogSeen } from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { getMyUser } from "../../utils/user.utils";

export const UpgradeDialog = () => {
  const shouldShowUpgradeDialog = useAppStore(
    (state) => getMyUser(state)?.shouldShowUpgradeDialog ?? false,
  );

  const handleDismiss = async () => {
    await markUpgradeDialogSeen();
  };

  return (
    <Dialog open={shouldShowUpgradeDialog} fullWidth maxWidth="sm">
      <DialogContent sx={{ px: 3, py: 3 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(239, 68, 68, 0.4)",
            }}
          >
            <RocketLaunch sx={{ fontSize: 40, color: "white" }} />
          </Box>
          <Stack spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={600}>
              <FormattedMessage defaultMessage="Your Pro Trial Has Ended" />
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage defaultMessage="Upgrade to Pro to continue enjoying all premium features." />
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Thank you for trying Voquill Pro! Your trial period has ended, but you can continue using Voquill with our free plan or upgrade to Pro to unlock all features." />
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 3 }}>
        <Button onClick={handleDismiss}>
          <FormattedMessage defaultMessage="Not Now" />
        </Button>
        <Button variant="contained" onClick={handleDismiss}>
          <FormattedMessage defaultMessage="Got it" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
