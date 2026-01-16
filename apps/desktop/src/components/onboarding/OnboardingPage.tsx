import { Stack } from "@mui/material";
import { useEffect } from "react";
import { trackOnboardingStep } from "../../utils/analytics.utils";
import { useAppStore } from "../../store";
import { A11yPermsForm } from "./A11yPermsForm";
import { ChooseLlmForm } from "./ChooseLlmForm";
import { ChooseTranscriptionForm } from "./ChooseTranscriptionForm";
import { CompanyForm } from "./CompanyForm";
import { KeybindingsForm } from "./KeybindingsForm";
import { MicCheckForm } from "./MicCheckForm";
import { MicPermsForm } from "./MicPermsForm";
import { SignInForm } from "./SignInForm";
import { TutorialForm } from "./TutorialForm";
import { UnlockedProForm } from "./UnlockedProForm";
import { UsernameForm } from "./UsernameForm";

export default function OnboardingPage() {
  const currentPage = useAppStore((state) => state.onboarding.currentPage);

  useEffect(() => {
    trackOnboardingStep(currentPage);
  }, [currentPage]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      sx={{ height: "100%", pb: 4 }}
    >
      {currentPage === "signIn" && <SignInForm />}
      {currentPage === "chooseTranscription" && <ChooseTranscriptionForm />}
      {currentPage === "chooseLlm" && <ChooseLlmForm />}
      {currentPage === "username" && <UsernameForm />}
      {currentPage === "company" && <CompanyForm />}
      {currentPage === "micPerms" && <MicPermsForm />}
      {currentPage === "a11yPerms" && <A11yPermsForm />}
      {currentPage === "keybindings" && <KeybindingsForm />}
      {currentPage === "micCheck" && <MicCheckForm />}
      {currentPage === "unlockedPro" && <UnlockedProForm />}
      {currentPage === "tutorial" && <TutorialForm />}
    </Stack>
  );
}
