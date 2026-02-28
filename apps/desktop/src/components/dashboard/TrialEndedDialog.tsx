import { ArrowForward } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { delayed } from "@repo/utilities";
import { useEffect, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { markUpgradeDialogSeen } from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { trackButtonClick, trackPageView } from "../../utils/analytics.utils";
import { getMyMember } from "../../utils/member.utils";
import { getMyUser } from "../../utils/user.utils";
import { surfaceMainWindow } from "../../utils/window.utils";
import { TrialEndedBackground } from "./TrialEndedBackground";

const MIN_WORDS_THRESHOLD = 100;

export const TrialEndedDialog = () => {
  const intl = useIntl();
  const hasFocusedRef = useRef(false);

  const shouldShowUpgradeDialog = useAppStore(
    (state) => getMyUser(state)?.shouldShowUpgradeDialog ?? false,
  );

  const member = useAppStore(getMyMember);
  const wordsToday = member?.wordsToday || 0;
  const wordsTotal = member?.wordsTotal || 0;
  const memberPlan = member?.plan ?? "free";
  const avgTalkingSpeedWpm = 135;
  const avgTypingSpeedWpm = 40;
  const timeTalked = wordsTotal / avgTalkingSpeedWpm;
  const timeTyped = wordsTotal / avgTypingSpeedWpm;
  const totalTimeSaved = timeTyped - timeTalked;

  const freeWordsPerDay = useAppStore(
    (state) => state.config?.freeWordsPerDay ?? 1_000,
  );

  const wordsRemaining = Math.max(0, freeWordsPerDay - wordsToday);
  const usagePercent = Math.min(100, (wordsToday / freeWordsPerDay) * 100);

  const shouldShow =
    shouldShowUpgradeDialog &&
    wordsToday >= MIN_WORDS_THRESHOLD &&
    memberPlan !== "pro";

  useEffect(() => {
    if (shouldShow && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      delayed(1000 * 4).then(() => {
        surfaceMainWindow();
        // showToast({
        //   title: intl.formatMessage({
        //     defaultMessage: "Your Pro trial has ended",
        //   }),
        //   message: intl.formatMessage({
        //     defaultMessage:
        //       "Upgrade now to continue voice typing without any limits.",
        //   }),
        //   toastType: "info",
        //   action: "surface_window",
        //   duration: 8_000,
        // });
      });
    }

    if (!shouldShow) {
      hasFocusedRef.current = false;
    } else {
      trackPageView("upgrade_dialog_after_trial_end");
    }
  }, [shouldShow, freeWordsPerDay, intl]);

  const handleDismiss = async () => {
    trackButtonClick("dismiss_upgrade_dialog_after_trial_end");
    await markUpgradeDialogSeen();
  };

  const handleUpgrade = async () => {
    trackButtonClick("upgrade_from_dialog_after_trial_end");
    await markUpgradeDialogSeen();
    openUpgradePlanDialog();
  };

  return (
    <Dialog
      open={shouldShow}
      fullScreen
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "level0",
            backgroundImage: "none",
          },
        },
      }}
    >
      {shouldShow && <TrialEndedBackground />}

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
          px: 4,
          py: 4,
          overflow: "auto",
        }}
      >
        <Stack spacing={4} alignItems="center" maxWidth={480}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h4" fontWeight={700}>
              <FormattedMessage defaultMessage="Don't lose unlimited dictation" />
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage defaultMessage="You've been dictating without limits all week. Keep unlimited words, faster processing, and priority features." />
            </Typography>
            {totalTimeSaved > 4 && (
              <Stack direction="row" spacing={1}>
                <Chip
                  label={
                    <FormattedMessage
                      defaultMessage="{words} words dictated"
                      values={{ words: wordsTotal.toLocaleString() }}
                    />
                  }
                  size="small"
                />
                <Chip
                  label={
                    <FormattedMessage
                      defaultMessage="{hours} hours saved"
                      values={{
                        hours: Math.round(totalTimeSaved / 60).toLocaleString(),
                      }}
                    />
                  }
                  size="small"
                />
              </Stack>
            )}
          </Stack>

          <Box
            sx={{
              width: "100%",
              p: 2.5,
              borderRadius: 2,
              backgroundColor: "level1",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage defaultMessage="Free plan daily limit" />
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  <FormattedMessage
                    defaultMessage="{remaining} / {total} words"
                    values={{
                      remaining: wordsRemaining.toLocaleString(),
                      total: freeWordsPerDay.toLocaleString(),
                    }}
                  />
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={usagePercent}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "level2",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    backgroundColor:
                      usagePercent >= 80
                        ? "#ef4444"
                        : usagePercent >= 50
                          ? "#f59e0b"
                          : "primary.main",
                  },
                }}
              />
            </Stack>
          </Box>

          <Stack spacing={1.5} width="100%">
            <Stack spacing={0.5}>
              <Button
                variant="blue"
                size="large"
                fullWidth
                onClick={handleUpgrade}
                endIcon={<ArrowForward />}
              >
                <FormattedMessage defaultMessage="Keep Pro plan" />
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                textAlign="center"
              >
                <FormattedMessage defaultMessage="Cancel anytime, no questions asked" />
              </Typography>
            </Stack>
            <Button
              onClick={handleDismiss}
              fullWidth
              sx={{ color: "text.secondary" }}
            >
              <FormattedMessage defaultMessage="Downgrade to free plan" />
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
};
