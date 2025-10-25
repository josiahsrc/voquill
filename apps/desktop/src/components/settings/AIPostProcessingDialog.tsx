import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { produceAppState, useAppStore } from "../../store";
import { SegmentedControl } from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";

type PostProcessingMode = "none" | "api";

export const AIPostProcessingDialog = () => {
  const open = useAppStore(
    (state) => state.settings.aiPostProcessingDialogOpen
  );
  const [mode, setMode] = useState<PostProcessingMode>("none");
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.aiPostProcessingDialogOpen = false;
    });
  };

  useEffect(() => {
    if (!open) {
      setMode("none");
      setSelectedApiKeyId(null);
    }
  }, [open]);

  const handleModeChange = useCallback((value: PostProcessingMode) => {
    setMode(value);
  }, []);

  const handleSelectedApiKeyChange = useCallback((id: string | null) => {
    setSelectedApiKeyId(id);
  }, []);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        AI post processing
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ ml: "auto" }}
          aria-label="Close"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} alignItems="flex-start">
          <Typography variant="body1" color="text.secondary">
            Tell Voquill how to enhance your transcripts after they are created.
          </Typography>

          <SegmentedControl<PostProcessingMode>
            value={mode}
            onChange={handleModeChange}
            options={[
              { value: "none", label: "None" },
              { value: "api", label: "API key" },
            ]}
            ariaLabel="Post-processing mode"
          />

          {mode === "none" ? (
            <Typography variant="body2" color="text.secondary">
              No AI post-processing will run on new transcripts.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              <ApiKeyList
                selectedApiKeyId={selectedApiKeyId}
                onChange={handleSelectedApiKeyChange}
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};
