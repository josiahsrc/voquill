import { CloseRounded } from "@mui/icons-material";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import { getIsOnTrial, getMyMember } from "../../utils/member.utils";

export function TrialExtensionCard() {
  const show = useAppStore((state) => {
    if (state.local.hasHiddenTrialExtensionCard) {
      return false;
    }

    if (!getIsOnTrial(state)) {
      return false;
    }

    const member = getMyMember(state);
    const trialEndsAt = member?.originalTrialEndsAt ?? member?.trialEndsAt;
    if (!trialEndsAt) {
      return false;
    }

    return new Date(trialEndsAt).getTime() > Date.now();
  });

  const wordsNeeded = useAppStore(
    (state) => state.config?.wordsNeededForTrialExtension ?? 200,
  );

  if (!show) {
    return null;
  }

  const handleDismiss = () => {
    produceAppState((draft) => {
      draft.local.hasHiddenTrialExtensionCard = true;
    });
  };

  return (
    <Box
      sx={{
        p: 3,
        py: 2,
        borderRadius: 1,
        background: "linear-gradient(135deg, #FF6B3558 0%, #FF8F0040 100%)",
        position: "relative",
      }}
    >
      <IconButton
        size="small"
        onClick={handleDismiss}
        sx={{ position: "absolute", top: 8, right: 8 }}
      >
        <CloseRounded fontSize="small" />
      </IconButton>
      <Stack spacing={1}>
        <Typography variant="h6" fontWeight={700}>
          <FormattedMessage defaultMessage="Earn extra trial days for free" />
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          <FormattedMessage
            defaultMessage="For the first 7 days of your trial, each day you dictate {words}+ words you earn an extra day of Voquill Pro."
            values={{ words: wordsNeeded }}
          />
        </Typography>
      </Stack>
    </Box>
  );
}
