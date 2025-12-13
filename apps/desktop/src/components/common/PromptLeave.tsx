import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import React, { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useBlocker, useLocation } from "react-router-dom";

export const PromptLeave = ({
  message = "Are you sure you want to leave this page?",
  when = true,
}: {
  message?: string;
  when?: boolean;
}) => {
  const location = useLocation();

  const blocker = useBlocker((data) => {
    return data.currentLocation.pathname !== data.nextLocation.pathname && when;
  });

  // Reset the blocker if the user cleans the form
  React.useEffect(() => {
    if (blocker.state === "blocked" && !when) {
      blocker.reset();
    }
  }, [blocker, when]);

  useEffect(() => {
    const handleBeforeUnload = (e: any) => {
      if (!when) return;

      e.preventDefault();
      e.returnValue = message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [message, when, location.pathname]);

  return (
    <Dialog open={blocker.state === "blocked"}>
      <DialogTitle>
        <FormattedMessage defaultMessage="Unsaved Changes" />
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={blocker.reset}>
          <FormattedMessage defaultMessage="Stay" />
        </Button>
        <Button onClick={blocker.proceed} variant="contained" color="primary">
          <FormattedMessage defaultMessage="Leave" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
