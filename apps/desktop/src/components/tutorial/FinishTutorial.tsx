import { Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { TutorialWrapper } from "./TutorialWrapper";

export const FinishTutorial = () => {
  return (
    <TutorialWrapper
      title={<FormattedMessage defaultMessage="You're all set!" />}
    >
      <Typography>
        <FormattedMessage defaultMessage="Congrats! Voquill is now ready across your entire computer. Press your dictation hotkey in any app and let your voice do the typing." />
      </Typography>
    </TutorialWrapper>
  );
};
