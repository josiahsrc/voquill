import { HourglassBottomRounded } from "@mui/icons-material";
import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { useInterval } from "../../hooks/helper.hooks";
import { useAppStore } from "../../store";
import { trackButtonClick } from "../../utils/analytics.utils";
import {
  getTrialDaysRemaining,
  getTrialProgress,
} from "../../utils/member.utils";
import { minutesToMilliseconds } from "../../utils/time.utils";

export const TrialCountdown = () => {
  const daysRemaining = useAppStore(getTrialDaysRemaining);
  const progress = useAppStore(getTrialProgress);
  const [, setTick] = useState(0);

  useInterval(
    minutesToMilliseconds(5),
    () => {
      setTick((tick) => tick + 1);
    },
    [],
  );

  const handleClick = () => {
    openUpgradePlanDialog();
    trackButtonClick("trial_countdown_subscribe_click", {
      daysLeft: daysRemaining,
    });
  };

  if (daysRemaining == null || progress == null) {
    return null;
  }

  const urgent = daysRemaining <= 0;
  const warning = daysRemaining <= 3;
  const barColor = urgent ? "error" : warning ? "warning" : "primary";

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.5}
      onClick={handleClick}
      sx={{
        cursor: "pointer",
        border: 1,
        borderColor: urgent
          ? "error.main"
          : warning
            ? "warning.main"
            : "divider",
        borderRadius: 2,
        pl: 1.5,
        pr: 1,
        py: 0.75,
        transition: "border-color 0.2s",
        "&:hover": {
          borderColor: urgent
            ? "error.dark"
            : warning
              ? "warning.dark"
              : "primary.main",
        },
      }}
    >
      <HourglassBottomRounded
        sx={{
          fontSize: 16,
          color: urgent
            ? "error.main"
            : warning
              ? "warning.main"
              : "text.secondary",
        }}
      />
      <Stack sx={{ minWidth: 80 }}>
        <Typography
          variant="caption"
          fontWeight={600}
          lineHeight={1.2}
          sx={{
            color: urgent
              ? "error.main"
              : warning
                ? "warning.main"
                : "text.primary",
          }}
        >
          {daysRemaining === 0 ? (
            <FormattedMessage defaultMessage="Last day" />
          ) : daysRemaining === 1 ? (
            <FormattedMessage defaultMessage="1 day left" />
          ) : (
            <FormattedMessage
              defaultMessage="{days} days left"
              values={{ days: daysRemaining }}
            />
          )}
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            color={barColor}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: "action.hover",
            }}
          />
        </Box>
      </Stack>
      <Button
        variant="blue"
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: 12,
          px: 1.5,
          py: 0.5,
          ml: 0.5,
          minWidth: 0,
          borderRadius: 2,
        }}
      >
        <FormattedMessage defaultMessage="Upgrade" />
      </Button>
    </Stack>
  );
};
