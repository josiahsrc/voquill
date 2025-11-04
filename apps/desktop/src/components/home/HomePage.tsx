import { Box, Stack, TextField, Typography } from "@mui/material";
import { useAppStore } from "../../store";
import { getMyUser, getMyUserName } from "../../utils/user.utils";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { Stat } from "./Stat";
import { HomeSideEffects } from "./HomeSideEffects";
import { DictationInstruction } from "../common/DictationInstruction";

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const userName = useAppStore(getMyUserName);

  const wordsThisMonth = user?.wordsThisMonth ?? 0;
  const wordsTotal = user?.wordsTotal ?? 0;

  return (
    <DashboardEntryLayout>
      <HomeSideEffects />
      <Stack direction="column">
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          Welcome, {userName}
        </Typography>
        <Box sx={{ my: 8 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mb: 2 }}
            justifyContent="space-around"
          >
            <Stat label="Words this month" value={wordsThisMonth} />
            <Stat label="Words total" value={wordsTotal} />
          </Stack>
        </Box>
        <Section
          title="Try it out"
          description="Use this space to type or paste anything and see how Voquill handles it. Nothing you write here is saved."
        >
          <Box sx={{ mb: 2 }}>
            <DictationInstruction />
          </Box>
          <TextField
            variant="outlined"
            fullWidth
            multiline
            minRows={5}
            placeholder="Start dictating here..."
            autoComplete="off"
          />
        </Section>
      </Stack>
    </DashboardEntryLayout>
  );
}
