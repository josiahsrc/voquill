import { firemix } from "@firemix/client";
import { Add, Close } from "@mui/icons-material";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import type { Hotkey } from "@repo/types";
import { showErrorSnackbar } from "../../actions/app.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { getHotkeyRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { registerHotkeys } from "../../utils/app.utils";
import { HotKey } from "../common/HotKey";
import { DICTATE_HOTKEY } from "../../utils/keyboard.utils";

type HotkeySettingProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  actionName: string;
};

const HotkeySetting = ({
  title,
  description,
  actionName,
}: HotkeySettingProps) => {
  const hotkeys = useAppStore((state) => {
    return Object.values(state.hotkeyById).filter(
      (hotkey) => hotkey.actionName === actionName
    );
  });

  const saveKey = async (id?: string, keys?: string[]) => {
    const newValue: Hotkey = {
      id: id ?? firemix().id(),
      actionName,
      keys: keys ?? [],
    };

    try {
      produceAppState((draft) => {
        registerHotkeys(draft, [newValue]);
        if (!draft.settings.hotkeyIds.includes(newValue.id)) {
          draft.settings.hotkeyIds.push(newValue.id);
        }
        draft.settings.hotkeysStatus = "success";
      });
      await getHotkeyRepo().saveHotkey(newValue);
    } catch (error) {
      console.error("Failed to save hotkey", error);
      showErrorSnackbar("Failed to save hotkey. Please try again.");
    }
  };

  const handleDeleteHotkey = async (id: string) => {
    try {
      produceAppState((draft) => {
        delete draft.hotkeyById[id];
        draft.settings.hotkeyIds = draft.settings.hotkeyIds.filter(
          (hid) => hid !== id
        );
      });
      await getHotkeyRepo().deleteHotkey(id);
    } catch (error) {
      console.error("Failed to delete hotkey", error);
      showErrorSnackbar("Failed to delete hotkey. Please try again.");
    }
  };

  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Stack spacing={1} flex={1}>
        <Typography variant="body1" fontWeight="bold">
          {title}
        </Typography>
        <Typography variant="body2">{description}</Typography>
      </Stack>
      <Stack spacing={1} alignItems="flex-end">
        {hotkeys.map((hotkey) => (
          <Stack
            key={hotkey.id}
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <HotKey
              value={hotkey.keys}
              onChange={(keys) => saveKey(hotkey.id, keys)}
            />
            <IconButton
              size="small"
              onClick={() => handleDeleteHotkey(hotkey.id)}
            >
              <Close color="disabled" />
            </IconButton>
          </Stack>
        ))}
        <Button
          variant="text"
          startIcon={<Add />}
          size="small"
          sx={{ py: 0.5 }}
          onClick={() => saveKey()}
        >
          <Typography variant="body2" fontWeight={500}>
            {hotkeys.length === 0 ? "Set hotkey" : "Add another"}
          </Typography>
        </Button>
      </Stack>
    </Stack>
  );
};

export const ShortcutsDialog = () => {
  const { open, hotkeysStatus } = useAppStore((state) => ({
    open: state.settings.shortcutsDialogOpen,
    hotkeysStatus: state.settings.hotkeysStatus,
  }));

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

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.shortcutsDialogOpen = false;
      draft.settings.hotkeysStatus = "idle";
    });
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
        <HotkeySetting
          title="Start/stop dictating"
          description="Start recording audio and transcribe your speech into text with AI."
          actionName={DICTATE_HOTKEY}
        />
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack spacing={1}>
          <Typography variant="h6">Keyboard shortcuts</Typography>
          <Typography variant="body2" color="textSecondary">
            Customize your keyboard shortcuts. Keyboard shortcuts can be
            triggered from within any app.
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>{renderContent()}</DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
