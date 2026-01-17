import { ArrowForward, Check, Email, TouchApp } from "@mui/icons-material";
import {
  Box,
  Button,
  keyframes,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { ChangeEvent, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showConfetti, showErrorSnackbar } from "../../actions/app.actions";
import {
  finishOnboarding,
  submitOnboarding,
} from "../../actions/onboarding.actions";
import discordIcon from "../../assets/discord.svg";
import { produceAppState, useAppStore } from "../../store";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { DictationInstruction } from "../common/DictationInstruction";
import { HotkeyBadge } from "../common/HotkeyBadge";
import { BouncyTooltip } from "./BouncyTooltip";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

const pulseDiscord = keyframes`
  0%, 100% {
    border-color: rgba(88, 101, 242, 0.4);
    box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.4);
  }
  50% {
    border-color: rgba(88, 101, 242, 1);
    box-shadow: 0 0 0 4px rgba(88, 101, 242, 0.3);
  }
`;

const pulseEmail = keyframes`
  0%, 100% {
    border-color: rgba(26, 115, 232, 0.4);
    box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.4);
  }
  50% {
    border-color: rgba(26, 115, 232, 1);
    box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.3);
  }
`;

const PAGE_COUNT = 2;

export const TutorialForm = () => {
  const intl = useIntl();
  const [stepIndex, setStepIndex] = useState(0);
  const [dictationValue, setDictationValue] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFieldFocused, setIsFieldFocused] = useState(false);
  const [hasStartedDictating, setHasStartedDictating] = useState(false);

  const hotkeyCombos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const primaryHotkey = hotkeyCombos[0] ?? [];
  const keysHeld = useAppStore((state) => state.keysHeld);
  const userName = useAppStore((state) => state.onboarding.name) || "Alex";

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

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await submitOnboarding();
        if (cancelled) {
          return;
        }
        produceAppState((draft) => {
          draft.onboarding.dictationOverrideEnabled = true;
        });
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };
    init();
    return () => {
      cancelled = true;
      produceAppState((draft) => {
        draft.onboarding.dictationOverrideEnabled = false;
      });
    };
  }, []);

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
      await finishOnboarding();
      showConfetti();
    } catch (err) {
      showErrorSnackbar(err);
      setSubmitting(false);
    }
  };

  const step1Placeholder = intl.formatMessage({
    defaultMessage: "Bagels are the breakfast of champions.",
  });

  const step2Placeholder = `Hey Sarah,

Great meeting you yesterday! Looking forward to next steps.

Best,
${userName}`;

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

  const bouncyTooltips = (
    <>
      <BouncyTooltip
        visible={!isFieldFocused && !hasStartedDictating}
        delay={0.7}
      >
        <TouchApp fontSize="small" />
        <Typography variant="body2" fontWeight={500}>
          <FormattedMessage defaultMessage="Click on the text field" />
        </Typography>
      </BouncyTooltip>
      <BouncyTooltip
        visible={isFieldFocused && !hasStartedDictating}
        delay={0.7}
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
    </>
  );

  const discordContent = (
    <Box sx={{ position: "relative", pb: 6 }}>
      <Stack
        spacing={0}
        sx={{
          bgcolor: "#313338",
          borderRadius: 1.33,
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
            minRows={2}
            fullWidth
            placeholder={step1Placeholder}
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
                      animation: `${pulseDiscord} 1.5s ease-in-out infinite`,
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
      {bouncyTooltips}
    </Box>
  );

  const emailContent = (
    <Box sx={{ position: "relative", pb: 6 }}>
      <Stack
        spacing={0}
        sx={{
          bgcolor: "#ffffff",
          borderRadius: 1.33,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
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
            borderBottom: "1px solid #e0e0e0",
            bgcolor: "#f5f5f5",
          }}
        >
          <Email sx={{ fontSize: 20, color: "#d93025" }} />
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: "#202124" }}
          >
            Email
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mb: 1,
                pb: 1,
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <Typography variant="caption" sx={{ color: "#5f6368" }}>
                To:
              </Typography>
              <Typography variant="body2" sx={{ color: "#202124" }}>
                sarah@company.com
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                pb: 1,
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <Typography variant="caption" sx={{ color: "#5f6368" }}>
                Subject:
              </Typography>
              <Typography variant="body2" sx={{ color: "#202124" }}>
                Great chatting yesterday! 🎉
              </Typography>
            </Box>
          </Box>
          <Box sx={{ position: "relative" }}>
            <TextField
              multiline
              minRows={8}
              fullWidth
              value={dictationValue}
              onChange={handleDictationChange}
              disabled={submitting}
              onFocus={() => setIsFieldFocused(true)}
              onBlur={() => setIsFieldFocused(false)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#ffffff",
                  borderRadius: 1,
                  "& fieldset": isFieldFocused
                    ? { borderColor: "#e0e0e0" }
                    : {
                        borderWidth: 2,
                        animation: `${pulseEmail} 1.5s ease-in-out infinite`,
                      },
                  "&:hover fieldset": {
                    borderColor: isFieldFocused ? "#e0e0e0" : undefined,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1a73e8",
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#202124",
                },
              }}
            />
            {dictationValue.length === 0 && (
              <Typography
                variant="body1"
                sx={{
                  position: "absolute",
                  top: 16.5,
                  left: 14,
                  right: 14,
                  color: "#5f6368",
                  pointerEvents: "none",
                  whiteSpace: "pre-wrap",
                }}
              >
                {step2Placeholder}
              </Typography>
            )}
          </Box>
        </Box>
      </Stack>
      {bouncyTooltips}
    </Box>
  );

  const stepper = (
    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
      {[0, 1].map((index) => (
        <Box
          key={index}
          onClick={() => {
            setStepIndex(index);
            setDictationValue("");
            setHasStartedDictating(false);
          }}
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: stepIndex === index ? "primary.main" : "action.disabled",
            transition: "background-color 0.2s ease",
            cursor: "pointer",
            "&:hover": {
              bgcolor: stepIndex === index ? "primary.main" : "action.hover",
            },
          }}
        />
      ))}
    </Stack>
  );

  const rightContent = (
    <Stack sx={{ width: "100%", maxWidth: 400, alignItems: "stretch" }}>
      {!initializing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {stepIndex === 0 ? discordContent : emailContent}
          {stepper}
        </motion.div>
      )}
    </Stack>
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
