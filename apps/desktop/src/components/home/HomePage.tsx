import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppStore } from "../../store";
import { getMyUser, getMyUserName } from "../../utils/user.utils";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { Stat } from "./Stat";
import { HomeSideEffects } from "./HomeSideEffects";
import { DictationInstruction } from "../common/DictationInstruction";
import { showToast } from "../../actions/toast.actions";

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const userName = useAppStore(getMyUserName);
  const intl = useIntl();

  const wordsThisMonth = user?.wordsThisMonth ?? 0;
  const wordsTotal = user?.wordsTotal ?? 0;

  return (
    <DashboardEntryLayout>
      <HomeSideEffects />
      <Stack direction="column">
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          <FormattedMessage
            defaultMessage="Welcome, {name}"
            values={{ name: userName }}
          />
        </Typography>
        <Box sx={{ my: 8 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mb: 2 }}
            justifyContent="space-around"
          >
            <Stat
              label={intl.formatMessage({
                defaultMessage: "Words this month",
              })}
              value={wordsThisMonth}
            />
            <Stat
              label={intl.formatMessage({
                defaultMessage: "Words total",
              })}
              value={wordsTotal}
            />
          </Stack>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() =>
                showToast("Info Toast", "This is an info message!", "info")
              }
            >
              Test Info Toast
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() =>
                showToast("Error Toast", "This is an error message!", "error")
              }
            >
              Test Error Toast
            </Button>
          </Stack>
        </Box>
        <Section
          title={intl.formatMessage({
            defaultMessage: "Try it out",
          })}
          description={intl.formatMessage({
            defaultMessage:
              "Use this space to type or paste anything and see how Voquill handles it. Nothing you write here is saved.",
          })}
        >
          <Box sx={{ mb: 2 }}>
            <DictationInstruction />
          </Box>
          <TextField
            variant="outlined"
            fullWidth
            multiline
            minRows={5}
            placeholder={intl.formatMessage({
              defaultMessage: "Start dictating here...",
            })}
            autoComplete="off"
          />
        </Section>
      </Stack>
    </DashboardEntryLayout>
  );
}
