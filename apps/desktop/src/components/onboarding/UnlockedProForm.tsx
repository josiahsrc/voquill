import {
  AllInclusive,
  ArrowForward,
  Devices,
  Mic,
  Spellcheck,
} from "@mui/icons-material";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { FormattedMessage } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { Logo } from "../common/Logo";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

const MotionStack = motion.create(Stack);
const MotionChip = motion.create(Chip);
const MotionTypography = motion.create(Typography);

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
};

export const UnlockedProForm = () => {
  const handleContinue = () => {
    goToOnboardingPage("tutorial");
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <Button
            variant="contained"
            onClick={handleContinue}
            endIcon={<ArrowForward />}
          >
            <FormattedMessage defaultMessage="Continue" />
          </Button>
        </motion.div>
      }
    >
      <Stack spacing={3}>
        <Box>
          <MotionChip
            label={<FormattedMessage defaultMessage="FREE TRIAL" />}
            sx={{
              mb: 2,
              fontWeight: 600,
              bgcolor: "level1",
              color: "text.secondary",
            }}
            {...scaleIn}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          <MotionTypography
            variant="h4"
            fontWeight={600}
            pb={1}
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          >
            <FormattedMessage defaultMessage="Pro mode unlocked 🙌" />
          </MotionTypography>
          <MotionTypography
            variant="body1"
            color="text.secondary"
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >
            <FormattedMessage defaultMessage="One week on us. No payment info required." />
          </MotionTypography>
        </Box>

        <Stack spacing={1.5}>
          <MotionStack
            direction="row"
            spacing={1.5}
            alignItems="center"
            {...fadeInUp}
            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
          >
            <AllInclusive sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="No word limits" />
            </Typography>
          </MotionStack>
          <MotionStack
            direction="row"
            spacing={1.5}
            alignItems="center"
            {...fadeInUp}
            transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
          >
            <Devices sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="Cross-device syncing" />
            </Typography>
          </MotionStack>
          <MotionStack
            direction="row"
            spacing={1.5}
            alignItems="center"
            {...fadeInUp}
            transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
          >
            <Mic sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="AI dictation" />
            </Typography>
          </MotionStack>
          <MotionStack
            direction="row"
            spacing={1.5}
            alignItems="center"
            {...fadeInUp}
            transition={{ delay: 0.6, duration: 0.4, ease: "easeOut" }}
          >
            <Spellcheck sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body1">
              <FormattedMessage defaultMessage="Word dictionary" />
            </Typography>
          </MotionStack>
        </Stack>
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <MotionStack
      direction="row"
      alignItems="center"
      spacing={2}
      {...fadeIn}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
      >
        <Logo width="4rem" height="4rem" />
      </motion.div>
      <MotionTypography
        variant="h3"
        fontWeight={700}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        Voquill
      </MotionTypography>
      <MotionChip
        label="Pro"
        sx={{
          bgcolor: "primary.main",
          color: "primary.contrastText",
          fontWeight: 700,
          fontSize: "1.25rem",
          height: 40,
          borderRadius: 1.5,
          "& .MuiChip-label": {
            px: 2,
          },
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.5,
          duration: 0.4,
          type: "spring",
          stiffness: 300,
          damping: 15,
        }}
      />
    </MotionStack>
  );

  return <DualPaneLayout left={form} right={rightContent} />;
};
