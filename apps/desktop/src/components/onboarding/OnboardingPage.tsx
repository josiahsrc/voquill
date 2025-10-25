import { Stack } from "@mui/material";
import { useAppStore } from "../../store";
import { NameForm } from "./NameForm";
import { PostProcessingMethodForm } from "./PostProcessingMethodForm";
import { TranscriptionMethodForm } from "./TranscriptionMethodForm";
import { TryItOutForm } from "./TryItOutForm";
import { WelcomeForm } from "./WelcomeForm";
import { useConsumeQueryParams } from "../../hooks/navigation.hooks";

export default function OnboardingPage() {
  const page = useAppStore((state) => state.onboarding.page);
  useConsumeQueryParams(["plan"], () => {});

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      sx={{ height: "100%", pb: 4 }}
    >
      {page === 0 && <WelcomeForm />}
      {page === 1 && <NameForm />}
      {page === 2 && <TranscriptionMethodForm />}
      {page === 3 && <PostProcessingMethodForm />}
      {page === 4 && <TryItOutForm />}
    </Stack>
  );
}
