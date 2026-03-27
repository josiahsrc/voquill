import { RocketLaunchOutlined } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { useAppStore } from "../../store";
import { trackButtonClick } from "../../utils/analytics.utils";
import { getMyMember } from "../../utils/member.utils";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const OutOfWordsCard = ({
  wordsRemaining,
}: {
  wordsRemaining: number;
}) => {
  const intl = useIntl();
  const thisWeekResetAt = useAppStore(
    (state) => getMyMember(state)?.thisWeekResetAt ?? null,
  );

  const handleUpgrade = () => {
    trackButtonClick("out_of_words_card_upgrade_click");
    openUpgradePlanDialog();
  };

  let refreshDate: string | null = null;
  if (thisWeekResetAt) {
    const nextReset = new Date(
      new Date(thisWeekResetAt).getTime() + MS_PER_WEEK,
    );
    refreshDate = intl.formatDate(nextReset, {
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
    });
  }

  const isOut = wordsRemaining === 0;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
        color: "white",
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          {isOut ? (
            <FormattedMessage defaultMessage="You're out of words" />
          ) : (
            <FormattedMessage
              defaultMessage="{words} words remaining this week"
              values={{ words: wordsRemaining.toLocaleString() }}
            />
          )}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {refreshDate ? (
            <FormattedMessage
              defaultMessage="Your free words refresh on {date}. Upgrade now to skip the wait and get unlimited dictation."
              values={{ date: refreshDate }}
            />
          ) : (
            <FormattedMessage defaultMessage="Your free words reset next week. Upgrade now to skip the wait and get unlimited dictation." />
          )}
        </Typography>
        <Button
          variant="contained"
          onClick={handleUpgrade}
          startIcon={<RocketLaunchOutlined />}
          sx={{
            alignSelf: "flex-start",
            mt: 0.5,
            backgroundColor: "rgba(255,255,255,0.2)",
            color: "white",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.3)",
            },
          }}
        >
          <FormattedMessage defaultMessage="Upgrade to Pro" />
        </Button>
      </Stack>
    </Box>
  );
};
