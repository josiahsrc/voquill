import { Stack } from "@mui/material";
import { useAppStore } from "../../store";
import { NameForm } from "./NameForm";
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
    </Stack>
  );
}
