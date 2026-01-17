import { Add, CancelOutlined, Close, RestartAlt } from "@mui/icons-material";
import { Button, IconButton, Stack, Switch, Typography } from "@mui/material";
import type { Hotkey } from "@repo/types";
import { emitTo } from "@tauri-apps/api/event";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getHotkeyRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { registerHotkeys } from "../../utils/app.utils";
import { createId } from "../../utils/id.utils";
import { getDefaultHotkeyCombosForAction } from "../../utils/keyboard.utils";
import { HotKey } from "../common/HotKey";

export type HotkeySettingProps = {
  title: ReactNode;
  description: ReactNode;
  actionName: string;
  buttonSize?: "small" | "medium";
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
};

const areCombosEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((key, index) => key === b[index]);

export const HotkeySetting = ({
  title,
  description,
  actionName,
  buttonSize = "small",
  enabled,
  onEnabledChange,
}: HotkeySettingProps) => {
  const hasEnabledToggle = enabled !== undefined;
  const isEnabled = enabled ?? true;
  const hotkeys = useAppStore((state) =>
    state.settings.hotkeyIds
      .map((id) => state.hotkeyById[id])
      .filter(
        (hotkey): hotkey is Hotkey =>
          Boolean(hotkey) && hotkey.actionName === actionName,
      ),
  );
  const defaultCombos = getDefaultHotkeyCombosForAction(actionName);

  const saveKey = async (id?: string, keys?: string[]) => {
    const newValue: Hotkey = {
      id: id ?? createId(),
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
      // Sync hotkey to overlay window
      emitTo("unified-overlay", "hotkey_update", { hotkey: newValue }).catch(
        console.error,
      );
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
          (hid) => hid !== id,
        );
      });
      await getHotkeyRepo().deleteHotkey(id);
      // Sync hotkey deletion to overlay window
      emitTo("unified-overlay", "hotkey_delete", { id }).catch(console.error);
    } catch (error) {
      console.error("Failed to delete hotkey", error);
      showErrorSnackbar("Failed to delete hotkey. Please try again.");
    }
  };

  const [primaryHotkey, ...additionalHotkeys] = hotkeys;
  const showDefaultAsPrimary = !primaryHotkey && defaultCombos.length > 0;
  const primaryValue =
    primaryHotkey?.keys ?? (showDefaultAsPrimary ? defaultCombos[0] : []);
  const isPrimaryUsingDefault =
    primaryHotkey != null &&
    defaultCombos.some((combo) => areCombosEqual(combo, primaryHotkey.keys));

  const handlePrimaryChange = (keys: string[]) => {
    if (primaryHotkey) {
      void saveKey(primaryHotkey.id, keys);
      return;
    }
    void saveKey(undefined, keys);
  };

  const handleRevertPrimary = () => {
    if (!primaryHotkey || defaultCombos.length === 0) {
      return;
    }
    void saveKey(primaryHotkey.id, defaultCombos[0]);
  };

  const buttonLabel =
    hotkeys.length === 0 && defaultCombos.length === 0 ? (
      <FormattedMessage defaultMessage="Set hotkey" />
    ) : (
      <FormattedMessage defaultMessage="Add another" />
    );

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabled = event.target.checked;
    onEnabledChange?.(newEnabled);

    // When enabling, set up a default hotkey if none exists
    if (newEnabled && !primaryHotkey && defaultCombos.length > 0) {
      void saveKey(undefined, defaultCombos[0]);
    }
  };

  const handleDisable = () => {
    onEnabledChange?.(false);
  };

  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Stack spacing={1} flex={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body1" fontWeight="bold">
            {title}
          </Typography>
          {hasEnabledToggle && (
            <Switch
              size="small"
              checked={isEnabled}
              onChange={handleToggle}
              inputProps={{
                "aria-label": "Enable hotkey",
              }}
            />
          )}
        </Stack>
        <Typography variant="body2">{description}</Typography>
      </Stack>
      {isEnabled && (
        <Stack spacing={1} alignItems="flex-end">
          <Stack direction="row" spacing={1} alignItems="center">
            <HotKey value={primaryValue} onChange={handlePrimaryChange} />
            {hasEnabledToggle ? (
              <IconButton
                size="small"
                onClick={handleDisable}
                aria-label="Disable hotkey"
              >
                <CancelOutlined color="disabled" />
              </IconButton>
            ) : (
              <>
                {primaryHotkey && defaultCombos.length === 0 && (
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteHotkey(primaryHotkey.id)}
                  >
                    <Close color="disabled" />
                  </IconButton>
                )}
                {primaryHotkey &&
                  defaultCombos.length > 0 &&
                  !isPrimaryUsingDefault && (
                    <IconButton
                      size="small"
                      aria-label="Revert to default hotkey"
                      onClick={handleRevertPrimary}
                    >
                      <RestartAlt color="disabled" />
                    </IconButton>
                  )}
              </>
            )}
          </Stack>
          {!hasEnabledToggle &&
            additionalHotkeys.map((hotkey) => (
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
          {!hasEnabledToggle &&
            (hotkeys.length > 0 || defaultCombos.length > 0) && (
              <Button
                variant="text"
                startIcon={<Add />}
                size={buttonSize}
                sx={{ py: 0.5 }}
                onClick={() => saveKey()}
              >
                <Typography variant="body2" fontWeight={500}>
                  {buttonLabel}
                </Typography>
              </Button>
            )}
        </Stack>
      )}
    </Stack>
  );
};
