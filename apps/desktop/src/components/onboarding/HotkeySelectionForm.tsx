import { Check } from "@mui/icons-material";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  submitOnboarding,
} from "../../actions/onboarding.actions";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getDefaultHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { getEffectivePlan } from "../../utils/member.utils";
import { HotkeySetting } from "../settings/HotkeySetting";
import { FormContainer } from "./OnboardingShared";

export const HotkeySelectionForm = () => {
  const submitting = useAppStore((state) => state.onboarding.submitting);
  const { status, savedHotkeyCount } = useAppStore((state) => ({
    status: state.settings.hotkeysStatus,
    savedHotkeyCount: Object.values(state.hotkeyById).filter(
      (hotkey) => hotkey.actionName === DICTATE_HOTKEY
    ).length,
  }));

  const hideBackButton = useAppStore((state) => {
    const myPlan = getEffectivePlan(state);
    return myPlan !== "community" || !state.onboarding.history.length;
  });

  const defaultHotkeys = getDefaultHotkeyCombosForAction(DICTATE_HOTKEY);
  const canFinish =
    status !== "loading" && (savedHotkeyCount > 0 || defaultHotkeys.length > 0);

  const handleFinish = () => {
    void submitOnboarding();
  };

  return (
    <FormContainer>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        <FormattedMessage defaultMessage="Choose your dictation shortcut" />
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        <FormattedMessage defaultMessage="Pick the keys you'll press to start and stop dictation anywhere. You can change this anytime from settings." />
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
            <FormattedMessage defaultMessage="Back" />
          </Button>
        )}
        <Button
          variant="contained"
          endIcon={<Check />}
          onClick={handleFinish}
          disabled={submitting || !canFinish}
        >
          <FormattedMessage defaultMessage="Finish" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
