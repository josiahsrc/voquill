import { ArrowForward, Check, TouchApp } from "@mui/icons-material";
import discordIcon from "../../assets/discord.svg";
import {
  Box,
  Button,
  keyframes,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { BouncyTooltip } from "./BouncyTooltip";

const pulse = keyframes`
  0%, 100% {
    border-color: rgba(88, 101, 242, 0.4);
    box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.4);
  }
  50% {
    border-color: rgba(88, 101, 242, 1);
    box-shadow: 0 0 0 4px rgba(88, 101, 242, 0.3);
  }
`;
import { showConfetti, showErrorSnackbar } from "../../actions/app.actions";
import { submitOnboarding } from "../../actions/onboarding.actions";
import { finishTutorial } from "../../actions/user.actions";
import { useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { DictationInstruction } from "../common/DictationInstruction";
import { HotkeyBadge } from "../common/HotkeyBadge";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

const PAGE_COUNT = 2;

export const TutorialForm = () => {
  const intl = useIntl();
  const [stepIndex, setStepIndex] = useState(0);
  const [dictationValue, setDictationValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isFieldFocused, setIsFieldFocused] = useState(false);
  const [hasStartedDictating, setHasStartedDictating] = useState(false);

  const hotkeyCombos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const primaryHotkey = hotkeyCombos[0] ?? [];
  const keysHeld = useAppStore((state) => state.keysHeld);

  useEffect(() => {
    if (primaryHotkey.length === 0) return;
    const hotkeySet = new Set(primaryHotkey);
    const allHotkeyKeysHeld = primaryHotkey.every((key) =>
      keysHeld.includes(key),
    );
    if (allHotkeyKeysHeld && keysHeld.length >= hotkeySet.size) {
      setHasStartedDictating(true);
    }
  }, [keysHeld, primaryHotkey]);

  const isLastStep = stepIndex === PAGE_COUNT - 1;
  const canContinue = dictationValue.trim().length > 0;

  const handleDictationChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDictationValue(event.target.value);
  };

  const handleContinue = async () => {
    if (!isLastStep) {
      setStepIndex(stepIndex + 1);
      setDictationValue("");
    } else {
      await handleFinish();
    }
  };

  const handleSkip = async () => {
    await handleFinish();
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await finishTutorial();
      await submitOnboarding();
      showConfetti();
    } catch (err) {
      showErrorSnackbar(err);
      setSubmitting(false);
    }
  };

  const step1Placeholder = intl.formatMessage({
    defaultMessage: "Bagels are the breakfast of champions.",
  });

  const step2Placeholder = intl.formatMessage({
    defaultMessage: `Hi Sarah,

Thanks for reaching out about the project timeline. I wanted to follow up on our conversation from yesterday.

I've reviewed the requirements and I think we can have the first draft ready by Friday. Let me know if that works for your team.

Best,
Alex`,
  });

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Stack direction="row" spacing={2}>
          <Button
            variant="text"
            onClick={() => void handleSkip()}
            disabled={submitting}
          >
            <FormattedMessage defaultMessage="Skip" />
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleContinue()}
            disabled={!canContinue || submitting}
            endIcon={isLastStep ? <Check /> : <ArrowForward />}
          >
            {isLastStep ? (
              <FormattedMessage defaultMessage="Finish" />
            ) : (
              <FormattedMessage defaultMessage="Continue" />
            )}
          </Button>
        </Stack>
      }
    >
      {stepIndex === 0 && (
        <Stack spacing={2} pb={8}>
          <Typography variant="h4" fontWeight={600}>
            <FormattedMessage defaultMessage="Try out dictation" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Press and hold your hotkey, then start talking. When you release the key, your speech will be converted to text." />
          </Typography>
          <DictationInstruction />
        </Stack>
      )}
      {stepIndex === 1 && (
        <Stack spacing={2} pb={8}>
          <Typography variant="h4" fontWeight={600}>
            <FormattedMessage defaultMessage="Now try an email" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Dictate a short email. Voquill works great for longer-form content like messages, notes, and documents." />
          </Typography>
          <DictationInstruction />
        </Stack>
      )}
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box sx={{ maxWidth: 400, width: "100%", position: "relative", pb: 6 }}>
      <Stack
        spacing={0}
        sx={{
          bgcolor: "#313338",
          borderRadius: 1.33,
          width: "100%",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.5,
            borderBottom: "1px solid #1e1f22",
          }}
        >
          <img
            src={discordIcon}
            alt="Discord"
            width={20}
            height={20}
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: "#f2f3f5" }}
          >
            Discord
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "#5865F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Typography sx={{ color: "#fff", fontWeight: 600 }}>J</Typography>
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: "#f2f3f5" }}
                >
                  Jordan
                </Typography>
                <Typography variant="caption" sx={{ color: "#949ba4" }}>
                  Today at 10:32 AM
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "#dbdee1", mt: 0.5 }}>
                What&apos;s your favorite breakfast?
              </Typography>
            </Box>
          </Box>
          <TextField
            multiline
            minRows={stepIndex === 0 ? 2 : 8}
            fullWidth
            placeholder={stepIndex === 0 ? step1Placeholder : step2Placeholder}
            value={dictationValue}
            onChange={handleDictationChange}
            disabled={submitting}
            onFocus={() => setIsFieldFocused(true)}
            onBlur={() => setIsFieldFocused(false)}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#383a40",
                borderRadius: 1,
                "& fieldset": isFieldFocused
                  ? { borderColor: "#1e1f22" }
                  : {
                      borderWidth: 2,
                      animation: `${pulse} 1.5s ease-in-out infinite`,
                    },
                "&:hover fieldset": {
                  borderColor: isFieldFocused ? "#1e1f22" : undefined,
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#5865F2",
                },
              },
              "& .MuiInputBase-input": {
                color: "#dbdee1",
                "&::placeholder": {
                  color: "#949ba4",
                  opacity: 1,
                },
              },
            }}
          />
        </Box>
      </Stack>
      <BouncyTooltip
        visible={!isFieldFocused && !hasStartedDictating}
        delay={0.4}
      >
        <TouchApp fontSize="small" />
        <Typography variant="body2" fontWeight={500}>
          <FormattedMessage defaultMessage="Click on the text field" />
        </Typography>
      </BouncyTooltip>
      <BouncyTooltip
        visible={isFieldFocused && !hasStartedDictating}
        delay={0.4}
      >
        <Typography variant="body2" fontWeight={500}>
          <FormattedMessage defaultMessage="Now press and hold" />
        </Typography>
        <HotkeyBadge
          keys={primaryHotkey}
          sx={{
            bgcolor: "rgba(255,255,255,0.2)",
            borderColor: "rgba(255,255,255,0.3)",
            color: "primary.contrastText",
          }}
        />
        <Typography variant="body2" fontWeight={500}>
          <FormattedMessage defaultMessage="to dictate" />
        </Typography>
      </BouncyTooltip>
    </Box>
  );

  return (
    <DualPaneLayout
      flex={[2, 3]}
      left={form}
      right={rightContent}
      rightSx={{ bgcolor: "transparent" }}
    />
  );
};
