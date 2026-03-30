import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

type NativeSetupResult = "success" | "require-restart" | "failed";
type NativeSetupStatus = "ready" | "needs-setup" | "needs-restart";

type SetupPhase = "checking" | "idle" | "running" | "require-restart" | "failed";

export const NativeSetupDialog = () => {
  const [phase, setPhase] = useState<SetupPhase>("checking");

  useEffect(() => {
    invoke<NativeSetupStatus>("get_native_setup_status").then((status) => {
      if (status === "needs-setup") {
        setPhase("idle");
      } else if (status === "needs-restart") {
        setPhase("require-restart");
      }
    });
  }, []);

  const handleStart = () => {
    setPhase("running");
    invoke<NativeSetupResult>("run_native_setup")
      .then((result) => {
        if (result === "require-restart") {
          setPhase("require-restart");
        } else if (result === "failed") {
          setPhase("failed");
        } else {
          setPhase("checking");
        }
      })
      .catch(() => setPhase("failed"));
  };

  const open = phase !== "checking";

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage defaultMessage="Wayland setup required" />
      </DialogTitle>
      <DialogContent>
        {phase === "idle" && (
          <Stack spacing={2}>
            <Typography>
              <FormattedMessage defaultMessage="Voquill needs to install and configure some tools to work correctly on Wayland. You'll be prompted for your password in order to complete installation." />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Voquill needs ydotool to paste text into your apps on Wayland. This will install the package, grant the necessary permissions, and start a background service." />
            </Typography>
          </Stack>
        )}
        {phase === "running" && (
          <Stack spacing={2} alignItems="center" py={2}>
            <CircularProgress size={32} />
            <Typography color="text.secondary">
              <FormattedMessage defaultMessage="Running setup..." />
            </Typography>
          </Stack>
        )}
        {phase === "require-restart" && (
          <Typography>
            <FormattedMessage defaultMessage="All done! Log out and log back in for the permissions to take effect, then reopen Voquill." />
          </Typography>
        )}
        {phase === "failed" && (
          <Typography color="error">
            <FormattedMessage defaultMessage="Something went wrong. You can retry or continue without it, but text pasting may not work correctly." />
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {phase === "idle" && (
          <Button variant="contained" onClick={handleStart}>
            <FormattedMessage defaultMessage="Continue" />
          </Button>
        )}
        {phase === "failed" && (
          <Button variant="contained" onClick={handleStart}>
            <FormattedMessage defaultMessage="Retry" />
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
