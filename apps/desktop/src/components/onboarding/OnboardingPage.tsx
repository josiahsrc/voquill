import { Stack } from "@mui/material";
import { useEffect } from "react";
import { trackOnboardingStep } from "../../utils/analytics.utils";
import { useAppStore } from "../../store";
import { A11yPermsForm } from "./A11yPermsForm";
import { ChooseLlmForm } from "./ChooseLlmForm";
import { ChooseTranscriptionForm } from "./ChooseTranscriptionForm";
import { KeybindingsForm } from "./KeybindingsForm";
import { MicCheckForm } from "./MicCheckForm";
import { MicPermsForm } from "./MicPermsForm";
import { SignInForm } from "./SignInForm";
import { TutorialForm } from "./TutorialForm";
import { UnlockedProForm } from "./UnlockedProForm";
import { UserDetailsForm } from "./UserDetailsForm";

export default function OnboardingPage() {
  const currentPage = useAppStore((state) => state.onboarding.currentPage);

  useEffect(() => {
    trackOnboardingStep(`v2_${currentPage}`);
  }, [currentPage]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      sx={{ height: "100%" }}
    >
      {currentPage === "signIn" && <SignInForm />}
      {currentPage === "chooseTranscription" && <ChooseTranscriptionForm />}
      {currentPage === "chooseLlm" && <ChooseLlmForm />}
      {currentPage === "userDetails" && <UserDetailsForm />}
      {currentPage === "micPerms" && <MicPermsForm />}
      {currentPage === "a11yPerms" && <A11yPermsForm />}
      {currentPage === "keybindings" && <KeybindingsForm />}
      {currentPage === "micCheck" && <MicCheckForm />}
      {currentPage === "unlockedPro" && <UnlockedProForm />}
      {currentPage === "tutorial" && <TutorialForm />}
    </Stack>
  );
}
