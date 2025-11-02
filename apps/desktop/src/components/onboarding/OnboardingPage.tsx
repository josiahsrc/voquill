import { Stack } from "@mui/material";
import { useAppStore } from "../../store";
import { OnboardingLoginForm } from "./OnboardingLoginForm";
import { NameForm } from "./NameForm";
import { PlanSelectionForm } from "./PlanSelectionForm";
import { PostProcessingMethodForm } from "./PostProcessingMethodForm";
import { TranscriptionMethodForm } from "./TranscriptionMethodForm";
import { TryItOutForm } from "./TryItOutForm";
import { WelcomeForm } from "./WelcomeForm";

export default function OnboardingPage() {
  const currentPage = useAppStore((state) => state.onboarding.currentPage);

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
      {currentPage === "tryItOut" && <TryItOutForm />}
    </Stack>
  );
}
