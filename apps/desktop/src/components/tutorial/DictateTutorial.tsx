import { TextField } from "@mui/material";
import { ChangeEvent } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import { DictationInstruction } from "../common/DictationInstruction";
import { TutorialWrapper } from "./TutorialWrapper";

export const DictateTutorial = () => {
  const intl = useIntl();
  const value = useAppStore((state) => state.tutorial.dictationValue);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    produceAppState((draft) => {
      draft.tutorial.dictationValue = event.target.value;
    });
  };

  return (
    <TutorialWrapper
      nextEnabled={value.trim().length > 0}
      title={<FormattedMessage defaultMessage="Try out AI dictation" />}
      subtitle={
        <FormattedMessage defaultMessage="Press and hold your hotkey then start talking. Once you release your hotkey, everything you said should be converted into text." />
      }
    >
      <DictationInstruction />
      <TextField
        autoFocus
        multiline
        minRows={4}
        fullWidth
        placeholder={intl.formatMessage({
          defaultMessage: 'Try saying "Bagels are the breakfast of champions"',
        })}
        value={value}
        onChange={handleChange}
      />
    </TutorialWrapper>
  );
};
