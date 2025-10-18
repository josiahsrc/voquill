import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { Hotkey } from "@repo/types";
import { getRec } from "@repo/utilities";
import { useMemo } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { getHotkeyRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { registerHotkeys } from "../../utils/app.utils";
import { HotKey } from "../common/HotKey";

type HotkeyAction = {
  actionName: string;
  title: string;
  description: string;
};

const HOTKEY_ACTIONS: HotkeyAction[] = [
  {
    actionName: "hello_world",
    title: "Hello World",
    description: "Sample shortcut for validating the hotkey recording flow.",
  },
];

export const ShortcutsDialog = () => {
  const { open, hotkeyIds, hotkeysStatus, hotkeyById } = useAppStore(
    (state) => ({
      open: state.settings.shortcutsDialogOpen,
      hotkeyIds: state.settings.hotkeyIds,
      hotkeysStatus: state.settings.hotkeysStatus,
      hotkeyById: state.hotkeyById,
    })
  );
  useAsyncEffect(async () => {
    if (!open || hotkeysStatus !== "idle") {
      return;
    }

    produceAppState((draft) => {
      draft.settings.hotkeysStatus = "loading";
    });

    try {
      const hotkeys = await getHotkeyRepo().listHotkeys();

      produceAppState((draft) => {
        registerHotkeys(draft, hotkeys);
        draft.settings.hotkeyIds = hotkeys.map((hotkey) => hotkey.id);
        draft.settings.hotkeysStatus = "success";
      });
    } catch (error) {
      console.error("Failed to load hotkeys", error);
      produceAppState((draft) => {
        draft.settings.hotkeysStatus = "error";
      });
      showErrorSnackbar("Failed to load hotkeys. Please try again.");
    }
  }, [open, hotkeysStatus]);

  const hotkeysByAction = useMemo(() => {
    const result: Record<string, Hotkey> = {};
    for (const id of hotkeyIds) {
      const hotkey = hotkeyById[id];
      if (!hotkey) {
        continue;
      }
      result[hotkey.actionName] = hotkey;
    }
    return result;
  }, [hotkeyIds, hotkeyById]);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.shortcutsDialogOpen = false;
      draft.settings.hotkeysStatus = "idle";
    });
  };

  const handleRecord = async (actionName: string, combo: string[]) => {
    const existing = hotkeysByAction[actionName];
    const id = existing?.id ?? crypto.randomUUID();
    const payload: Hotkey = {
      id,
      actionName,
      keys: combo,
    };

    try {
      const saved = await getHotkeyRepo().saveHotkey(payload);

      produceAppState((draft) => {
        registerHotkeys(draft, [saved]);
        if (!draft.settings.hotkeyIds.includes(saved.id)) {
          draft.settings.hotkeyIds.push(saved.id);
        }
        draft.settings.hotkeysStatus = "success";
      });
    } catch (error) {
      console.error("Failed to save hotkey", error);
      showErrorSnackbar("Failed to save hotkey. Please try again.");
    }
  };

  const renderContent = () => {
    if (hotkeysStatus === "loading") {
      return (
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          sx={{ py: 4 }}
        >
          <CircularProgress size={24} />
        </Stack>
      );
    }

    if (hotkeysStatus === "error") {
      return (
        <Alert severity="error" variant="outlined">
          We could not load your hotkeys. Close and reopen the dialog to try
          again.
        </Alert>
      );
    }

    return (
      <Stack spacing={3}>
        {HOTKEY_ACTIONS.map((action) => {
          const assigned = getRec(hotkeysByAction, action.actionName);

          return (
            <Stack key={action.actionName} spacing={1.5} pb={2}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </Stack>
              <HotKey
                value={assigned?.keys}
                onChange={(combo) => handleRecord(action.actionName, combo)}
              />
            </Stack>
          );
        })}
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Hotkey shortcuts</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <DialogContentText>
            Record custom keyboard shortcuts and store them locally for future
            use.
          </DialogContentText>
          {renderContent()}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
