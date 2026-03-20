import { Android, Apple } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import qrCodeAndroid from "../../assets/qr-code-android.png";
import qrCodeIos from "../../assets/qr-code-ios.png";
import { produceAppState, useAppStore } from "../../store";

const closeMobileAppDialog = () => {
  produceAppState((draft) => {
    draft.settings.mobileAppDialogOpen = false;
  });
};

export const MobileAppDialog = () => {
  const open = useAppStore((state) => state.settings.mobileAppDialogOpen);

  return (
    <Dialog open={open} onClose={closeMobileAppDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage defaultMessage="Now available for iOS and Android!" />
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          <FormattedMessage defaultMessage="Scan a QR code below to download Voquill on your phone. Let us know on Discord if you have any feedback! We're actively building out these apps." />
        </Typography>
        <Stack
          direction="row"
          justifyContent="space-evenly"
          alignItems="center"
        >
          <Stack alignItems="center" spacing={1}>
            <Box
              component="img"
              src={qrCodeIos}
              alt="App Store QR code"
              sx={{
                width: 160,
                height: 160,
                borderRadius: 2,
              }}
            />
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Apple sx={{ fontSize: 18 }} />
              <Typography variant="subtitle2">
                <FormattedMessage defaultMessage="App Store" />
              </Typography>
            </Stack>
          </Stack>
          <Stack alignItems="center" spacing={1}>
            <Box
              component="img"
              src={qrCodeAndroid}
              alt="Google Play QR code"
              sx={{
                width: 160,
                height: 160,
                borderRadius: 2,
              }}
            />
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Android sx={{ fontSize: 18 }} />
              <Typography variant="subtitle2">
                <FormattedMessage defaultMessage="Google Play" />
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeMobileAppDialog}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
