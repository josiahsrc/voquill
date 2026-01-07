import { TextField, Typography } from "@mui/material";
import { ChangeEvent, Fragment } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import {
  AGENT_DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { HotkeyBadge } from "../common/HotkeyBadge";
import { TutorialWrapper } from "./TutorialWrapper";

export const AgentModeTutorial = () => {
  const intl = useIntl();
  const value = useAppStore((state) => state.tutorial.agentDictationValue);
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, AGENT_DICTATE_HOTKEY),
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    produceAppState((draft) => {
      draft.tutorial.agentDictationValue = event.target.value;
    });
  };

  const hotkeys = (
    <>
      {combos.map((combo, index) => {
        const key = combo.join("|");
        const isLast = index === combos.length - 1;
        const separator = (() => {
          if (isLast) {
            return "";
          }
          if (combos.length === 2) {
            return " or ";
          }
          if (index === combos.length - 2) {
            return ", or ";
          }
          return ", ";
        })();

        return (
          <Fragment key={key}>
            <HotkeyBadge keys={combo} sx={{ mx: 0.25 }} />
            {separator}
          </Fragment>
        );
      })}
    </>
  );

  return (
    <TutorialWrapper
      nextEnabled={value.trim().length > 0}
      title={<FormattedMessage defaultMessage="Try Agent Mode" />}
      subtitle={
        <FormattedMessage defaultMessage="Agent Mode lets you give voice commands to write, edit, or transform text. It can read what's already in the text field and rewrite it based on your instructions." />
      }
    >
      <Typography variant="body2" color="text.secondary" component="div">
        <FormattedMessage
          defaultMessage="Press {hotkeys} and say something like 'Write an email to Bob about his shoes'."
          values={{ hotkeys }}
        />
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <FormattedMessage defaultMessage="Tip: Run Agent Mode multiple times to refine the text. It's smart enough to read what's in the text box and rewrite it based on your new instructions." />
      </Typography>
      <TextField
        autoFocus
        multiline
        minRows={4}
        fullWidth
        placeholder={intl.formatMessage({
          defaultMessage:
            'Try saying "Write an email to Bob about his shoes" or "Make this more formal"',
        })}
        value={value}
        onChange={handleChange}
      />
    </TutorialWrapper>
  );
};
