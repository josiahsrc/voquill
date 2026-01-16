/*
import { ArrowForward } from "@mui/icons-material";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  goBackOnboardingPage,
  goToOnboardingPage,
} from "../../../actions/onboarding.actions";
import { useAppStore } from "../../../store";
import {
  DICTATE_HOTKEY,
  getDefaultHotkeyCombosForAction,
} from "../../../utils/keyboard.utils";
import { getEffectivePlan } from "../../../utils/member.utils";
import { KeyPressSimulator } from "../../common/KeyPressSimulator";
import { HotkeySetting } from "../../settings/HotkeySetting";
import { FormContainer } from "../OnboardingShared";

export const HotkeySelectionForm = () => {
  const { status, hotkeys } = useAppStore((state) => ({
    status: state.settings.hotkeysStatus,
    hotkeys: Object.values(state.hotkeyById).filter(
      (hotkey) => hotkey.actionName === DICTATE_HOTKEY,
    ),
  }));
  const savedHotkeyCount = hotkeys.length;

  const hideBackButton = useAppStore((state) => {
    const myPlan = getEffectivePlan(state);
    return myPlan !== "community" || !state.onboarding.history.length;
  });

  const defaultHotkeys = getDefaultHotkeyCombosForAction(DICTATE_HOTKEY);
  const canFinish =
    status !== "loading" && (savedHotkeyCount > 0 || defaultHotkeys.length > 0);

  const handleNext = () => {
    goToOnboardingPage("microphone");
  };

  const [primaryHotkey] = hotkeys;
  const showDefaultAsPrimary = !primaryHotkey && defaultHotkeys.length > 0;
  const primaryValue =
    primaryHotkey?.keys ?? (showDefaultAsPrimary ? defaultHotkeys[0] : []);

  return (
    <FormContainer sx={{ maxWidth: 800 }}>
      <Stack direction="row" spacing={6} alignItems="stretch">
        <Stack flex={1} spacing={2}>
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
        </Stack>

        <Stack
          spacing={2}
          mt={4}
          mb={2}
          width={224}
          alignItems="center"
          textAlign="center"
          sx={{
            bgcolor: "level1",
            borderRadius: 2,
            py: 3,
            px: 4,
          }}
        >
          <Typography variant="headlineMedium">
            <FormattedMessage defaultMessage="Try it out" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Try pressing your dictation shortcut to see if it works!" />
          </Typography>
          <KeyPressSimulator keys={primaryValue} />
        </Stack>
      </Stack>

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
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={!canFinish}
        >
          <FormattedMessage defaultMessage="Next" />
        </Button>
      </Stack>
    </FormContainer>
  );
};
*/
