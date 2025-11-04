import { CircularProgress, Stack, Typography, Button } from "@mui/material";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getDefaultHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { HotkeySetting } from "../settings/HotkeySetting";
import { FormContainer } from "./OnboardingShared";
import { getMyMember } from "../../utils/member.utils";

export const HotkeySelectionForm = () => {
  const { status, savedHotkeyCount } = useAppStore((state) => ({
    status: state.settings.hotkeysStatus,
    savedHotkeyCount: Object.values(state.hotkeyById).filter(
      (hotkey) => hotkey.actionName === DICTATE_HOTKEY
    ).length,
  }));

  const hideBackButton = useAppStore((state) => {
    const myMember = getMyMember(state);
    return myMember?.plan === "pro" || !state.onboarding.history.length;
  });

  const defaultHotkeys = getDefaultHotkeyCombosForAction(DICTATE_HOTKEY);
  const canContinue =
    status !== "loading" && (savedHotkeyCount > 0 || defaultHotkeys.length > 0);

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Choose your dictation shortcut
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Pick the keys you&apos;ll press to start and stop dictation anywhere.
        You can change this anytime from settings.
      </Typography>

      {status === "loading" ? (
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          sx={{ py: 4 }}
        >
          <CircularProgress size={24} />
        </Stack>
      ) : (
        <HotkeySetting
          title="Start/stop dictating"
          description="Customize the keyboard shortcut that toggles dictation."
          actionName={DICTATE_HOTKEY}
          buttonSize="medium"
        />
      )}

      <Stack direction="row" justifyContent="space-between" mt={4} pb={4}>
        {hideBackButton ? (
          <div />
        ) : (
          <Button
            onClick={() => goBackOnboardingPage()}
            disabled={status === "loading"}
          >
            Back
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => goToOnboardingPage("tryItOut")}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </Stack>
    </FormContainer>
  );
};
