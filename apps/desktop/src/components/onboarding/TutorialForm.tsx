import { ArrowForward, Check } from "@mui/icons-material";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showConfetti, showErrorSnackbar } from "../../actions/app.actions";
import { submitOnboarding } from "../../actions/onboarding.actions";
import { finishTutorial } from "../../actions/user.actions";
import { DictationInstruction } from "../common/DictationInstruction";
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
    defaultMessage: 'Try saying "Bagels are the breakfast of champions"',
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
    <Stack
      spacing={3}
      sx={{
        bgcolor: "level1",
        borderRadius: 2,
        p: 4,
        maxWidth: 400,
        width: "100%",
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        <FormattedMessage defaultMessage="Dictate into this field" />
      </Typography>
      <TextField
        autoFocus
        multiline
        minRows={stepIndex === 0 ? 4 : 8}
        fullWidth
        placeholder={stepIndex === 0 ? step1Placeholder : step2Placeholder}
        value={dictationValue}
        onChange={handleDictationChange}
        disabled={submitting}
      />
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
