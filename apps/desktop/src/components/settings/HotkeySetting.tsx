import { firemix } from "@firemix/client";
import { Add, Close } from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import type { Hotkey } from "@repo/types";
import type { ReactNode } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getHotkeyRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { registerHotkeys } from "../../utils/app.utils";
import {
  getDefaultHotkeyCombosForAction,
  getPrettyKeyName,
} from "../../utils/keyboard.utils";
import { HotKey } from "../common/HotKey";

export type HotkeySettingProps = {
  title: ReactNode;
  description: ReactNode;
  actionName: string;
  buttonSize?: "small" | "medium";
};

export const HotkeySetting = ({
  title,
  description,
  actionName,
  buttonSize = "small",
}: HotkeySettingProps) => {
  const [hotkeys, defaultCombos] = useAppStore((state) => {
    const res = Object.values(state.hotkeyById).filter(
      (hotkey) => hotkey.actionName === actionName
    );

    const defaults =
      res.length === 0 ? getDefaultHotkeyCombosForAction(actionName) : [];

    return [res, defaults];
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
        {defaultCombos.length > 0 && (
          <Typography
            variant="body2"
            color="textSecondary"
            maxWidth={200}
            textAlign="right"
            component="div"
          >
            <span>Using default hotkey </span>
            {defaultCombos.map((combo, index) => {
              const pretty = combo.map(getPrettyKeyName).join(" + ");
              return (
                <Box
                  key={pretty}
                  component="span"
                  sx={{
                    display: "inline-block",
                    fontWeight: "bold",
                    border: "1px solid",
                    borderRadius: 0.5,
                    px: 0.5,
                    ml: index === 0 ? 0 : 0.5,
                  }}
                >
                  {pretty}
                </Box>
              );
            })}
          </Typography>
        )}
        <Button
          variant="text"
          startIcon={defaultCombos.length > 0 ? undefined : <Add />}
          size={buttonSize}
          sx={{ py: 0.5 }}
          onClick={() => saveKey()}
        >
          <Typography variant="body2" fontWeight={500}>
            {defaultCombos.length > 0
              ? "Change hotkey"
              : hotkeys.length === 0
                ? "Set hotkey"
                : "Add another"}
          </Typography>
        </Button>
      </Stack>
    </Stack>
  );
};
