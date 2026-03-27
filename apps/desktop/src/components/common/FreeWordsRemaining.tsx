import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { useAppStore } from "../../store";
import { trackButtonClick } from "../../utils/analytics.utils";
import { getMyMember } from "../../utils/member.utils";

export const FreeWordsRemaining = () => {
  const wordsThisWeek = useAppStore(
    (state) => getMyMember(state)?.wordsThisWeek ?? 0,
  );
  const freeWordsPerWeek = useAppStore(
    (state) => state.config?.freeWordsPerWeek ?? 1_000,
  );
  const [hovered, setHovered] = useState(false);

  const wordsRemaining = Math.max(0, freeWordsPerWeek - wordsThisWeek);
  const remainingPercent = Math.max(
    0,
    Math.min(100, (wordsRemaining / freeWordsPerWeek) * 100),
  );

  const handleClick = () => {
    openUpgradePlanDialog();
    trackButtonClick("free_words_remaining_upgrade_click", {
      wordsRemaining,
    });
  };

  const urgent = wordsRemaining === 0;
  const warning = remainingPercent <= 20;
  const barColor = urgent ? "error" : warning ? "warning" : "primary";

  const defaultText =
    wordsRemaining === 0 ? (
      <FormattedMessage defaultMessage="No words left" />
    ) : (
      <FormattedMessage
        defaultMessage="{words} words left"
        values={{ words: wordsRemaining.toLocaleString() }}
      />
    );

  const hoverText = <FormattedMessage defaultMessage="Unlimited words" />;

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.5}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        cursor: "pointer",
        border: 1,
        borderColor: urgent ? "divider" : warning ? "warning.main" : "divider",
        borderRadius: 2,
        pl: 2,
        pr: 1,
        py: 0.75,
        transition: "border-color 0.2s",
        "&:hover": {
          borderColor: "blue",
        },
      }}
    >
      <Stack
        sx={{
          minWidth: 96,
          height: 24,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            transition: "transform 0.25s ease, opacity 0.25s ease",
            transform: hovered ? "translateY(-100%)" : "translateY(0)",
            opacity: hovered ? 0 : 1,
          }}
        >
          <Typography
            variant="caption"
            fontWeight={600}
            lineHeight={1.2}
            noWrap
            sx={{
              color: urgent
                ? "text.secondary"
                : warning
                  ? "warning.main"
                  : "text.primary",
            }}
          >
            {defaultText}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={remainingPercent}
              color={barColor}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: "action.hover",
              }}
            />
          </Box>
        </Box>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            transition: "transform 0.25s ease, opacity 0.25s ease",
            transform: hovered ? "translateY(0)" : "translateY(100%)",
            opacity: hovered ? 1 : 0,
          }}
        >
          <Typography
            variant="caption"
            fontWeight={600}
            lineHeight={1.2}
            noWrap
            sx={{ color: "primary.main" }}
          >
            {hoverText}
          </Typography>
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
