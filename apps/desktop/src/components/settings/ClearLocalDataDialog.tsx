import { invoke } from "@tauri-apps/api/core";
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { produceAppState, useAppStore } from "../../store";

const CONFIRMATION_PHRASE = "clear";

export const ClearLocalDataDialog = () => {
  const open = useAppStore((state) => state.settings.clearLocalDataDialogOpen);
  const [confirmationValue, setConfirmationValue] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.clearLocalDataDialogOpen = false;
    });
    setConfirmationValue("");
    setIsClearing(false);
    setErrorMessage(null);
  };

  const confirmationMatches =
    confirmationValue.trim().toLowerCase() === CONFIRMATION_PHRASE;

  const handleClear = async () => {
    if (!confirmationMatches || isClearing) {
      return;
    }

    setIsClearing(true);
    setErrorMessage(null);

    try {
      await invoke("clear_local_data");
      handleClose();
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear local data", error);
      const message =
        error instanceof Error ? error.message : "Failed to clear local data.";
      setErrorMessage(message);
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Clear local data</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="warning" variant="outlined">
            <AlertTitle>This action permanently removes local data</AlertTitle>
            <Typography variant="body2">
              This will delete all preferences, dictionary entries, and saved
              transcriptions from this device. The action cannot be undone.
            </Typography>
          </Alert>
          <Typography variant="body2">
            To confirm, type{" "}
            <Typography
              component="span"
              variant="body2"
              fontWeight="bold"
              sx={{ fontFamily: "inherit" }}
            >
              {CONFIRMATION_PHRASE}
            </Typography>{" "}
            below and click Clear local data.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Confirmation phrase"
            value={confirmationValue}
            onChange={(event) => setConfirmationValue(event.target.value)}
            disabled={isClearing}
            placeholder={CONFIRMATION_PHRASE}
            autoComplete="off"
          />
          {errorMessage && (
            <Alert severity="error" variant="outlined">
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isClearing}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleClear}
          disabled={!confirmationMatches || isClearing}
        >
          {isClearing ? "Clearing..." : "Clear local data"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
