import { Stack } from "@mui/material";
import { useEffect } from "react";
import { loadPrices } from "../../actions/pricing.actions";
import { produceAppState, useAppStore } from "../../store";
import { getMyMember } from "../../utils/member.utils";
import { AgentHotkeySelectionForm } from "./AgentHotkeySelectionForm";
import { AgentModeMethodForm } from "./AgentModeMethodForm";
import { HotkeySelectionForm } from "./HotkeySelectionForm";
import { MicrophoneSelectionForm } from "./MicrophoneSelectionForm";
import { NameForm } from "./NameForm";
import { OnboardingLoginForm } from "./OnboardingLoginForm";
import { PlanSelectionForm } from "./PlanSelectionForm";
import { PostProcessingMethodForm } from "./PostProcessingMethodForm";
import { TranscriptionMethodForm } from "./TranscriptionMethodForm";
import { WelcomeForm } from "./WelcomeForm";

export default function OnboardingPage() {
  const currentPage = useAppStore((state) => state.onboarding.currentPage);

  useEffect(() => {
    loadPrices();
    produceAppState((draft) => {
      draft.login.mode = "signUp";

      const member = getMyMember(draft);
      if (member?.plan === "pro") {
        draft.onboarding.currentPage = "hotkeys";
      }
    });
  }, []);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      sx={{ height: "100%", pb: 4 }}
    >
      {currentPage === "welcome" && <WelcomeForm />}
      {currentPage === "name" && <NameForm />}
      {currentPage === "plan" && <PlanSelectionForm />}
      {currentPage === "login" && <OnboardingLoginForm />}
      {currentPage === "transcription" && <TranscriptionMethodForm />}
      {currentPage === "postProcessing" && <PostProcessingMethodForm />}
      {currentPage === "agentMode" && <AgentModeMethodForm />}
      {currentPage === "agentHotkey" && <AgentHotkeySelectionForm />}
      {currentPage === "hotkeys" && <HotkeySelectionForm />}
      {currentPage === "microphone" && <MicrophoneSelectionForm />}
    </Stack>
  );
}
