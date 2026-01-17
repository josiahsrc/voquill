import { ArrowForward } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { getHotkeyRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { registerHotkeys } from "../../utils/app.utils";
import { createId } from "../../utils/id.utils";
import {
  DICTATE_HOTKEY,
  getDefaultHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { KeyPressSimulator } from "../common/KeyPressSimulator";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const KeybindingsForm = () => {
  const [isListening, setIsListening] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const keysHeld = useAppStore((s) => s.keysHeld);
  const hotkeys = useAppStore((state) =>
    state.settings.hotkeyIds
      .map((id) => state.hotkeyById[id])
      .filter((hotkey) => hotkey?.actionName === DICTATE_HOTKEY),
  );

  const defaultCombos = getDefaultHotkeyCombosForAction(DICTATE_HOTKEY);
  const [primaryHotkey] = hotkeys;
  const currentKeys =
    primaryHotkey?.keys ?? (defaultCombos.length > 0 ? defaultCombos[0] : []);

  const lastEmittedRef = useRef<string[]>(currentKeys);
  const previousKeysHeldRef = useRef<string[]>([]);

  useEffect(() => {
    produceAppState((draft) => {
      draft.isRecordingHotkey = isListening;
    });
  }, [isListening]);

  useEffect(() => {
    if (!isListening) {
      previousKeysHeldRef.current = [];
      return;
    }

    const seen = new Set<string>();
    const held = keysHeld.filter((k: string) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const previousHeld = previousKeysHeldRef.current;
    if (previousHeld.length > 0 && held.length < previousHeld.length) {
      setIsListening(false);
      previousKeysHeldRef.current = [];
      return;
    }

    previousKeysHeldRef.current = held;

    if (held.length === 0) return;

    if (held.length === 1 && held[0] === "Escape") {
      setIsListening(false);
      return;
    }

    const last = lastEmittedRef.current ?? [];
    const lastSet = new Set(last);
    const anyNewKey = held.some((k) => !lastSet.has(k));
    if (held.length > last.length || anyNewKey) {
      lastEmittedRef.current = held;
      void saveKey(held);
    }
  }, [keysHeld, isListening]);

  const saveKey = async (keys: string[]) => {
    const newValue = {
      id: primaryHotkey?.id ?? createId(),
      actionName: DICTATE_HOTKEY,
      keys,
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

  const handleChangeShortcut = () => {
    lastEmittedRef.current = [];
    setIsListening(true);
    boxRef.current?.focus();
  };

  const handleConfirm = () => {
    goToOnboardingPage("micCheck");
  };

  const form = (
    <OnboardingFormLayout back={<BackButton />} actions={<div />}>
      <Stack spacing={2} pb={8}>
        <Typography variant="h4" fontWeight={600}>
          <FormattedMessage defaultMessage="Try your dictation shortcut" />
        </Typography>
        <Typography variant="body1" color="text.secondary">
          <FormattedMessage
            defaultMessage="The {fnKey} key works great for most users."
            values={{
              fnKey: (
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    px: 0.75,
                    py: 0.25,
                    bgcolor: "level1",
                    borderRadius: 0.5,
                    border: "1px solid",
                    borderColor: "divider",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  fn
                </Box>
              ),
            }}
          />
        </Typography>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Stack
      ref={boxRef}
      tabIndex={0}
      onBlur={() => setIsListening(false)}
      spacing={3}
      sx={{
        bgcolor: "level1",
        borderRadius: 2,
        p: 4,
        maxWidth: 400,
        outline: "none",
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        {isListening ? (
          <FormattedMessage defaultMessage="Press your preferred key combination" />
        ) : (
          <FormattedMessage defaultMessage="Does the key light up green when pressed?" />
        )}
      </Typography>

      <Box
        sx={{
          bgcolor: "level2",
          borderRadius: 2,
          p: 3,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {isListening ? (
          <Box
            sx={{
              minWidth: 48,
              height: 48,
              px: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "level2",
              border: "2px dashed",
              borderColor: "primary.main",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Waiting for input..." />
            </Typography>
          </Box>
        ) : (
          <KeyPressSimulator keys={currentKeys} />
        )}
      </Box>

      {!isListening && (
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="text" onClick={handleChangeShortcut}>
            <FormattedMessage defaultMessage="Change hotkey" />
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            endIcon={<ArrowForward />}
          >
            <FormattedMessage defaultMessage="It works" />
          </Button>
        </Stack>
      )}
    </Stack>
  );

  return (
    <DualPaneLayout
      flex={[2, 3]}
      left={form}
      right={rightContent}
      rightSx={{ bgcolor: "transparent" }}
    />
  );
};
